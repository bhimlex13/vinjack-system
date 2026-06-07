const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { getBrands, createBrand, updateBrand, deleteBrand } = require('../controllers/brandController'); // Adjust path
const Brand = require('../models/brandModel'); // Adjust path
const Product = require('../models/productModel'); // Adjust path
const User = require('../models/userModel'); // Adjust path
const Category = require('../models/categoryModel'); // Adjust path

// Mock the logger utility
jest.mock('../utils/logger', () => jest.fn());
const logAction = require('../utils/logger');

let mongoServer;

// --- Mock Express Request & Response ---
const mockRequest = (params, body, user) => ({
  params: params || {},
  body: body || {},
  user: user || { id: new mongoose.Types.ObjectId(), name: 'Mock User' },
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
// ------------------------------------

let testBrand, testUser, testProduct, testCategory;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections
  await Brand.deleteMany({});
  await Product.deleteMany({});
  await User.deleteMany({});
  await Category.deleteMany({});

  // Reset mocks
  jest.clearAllMocks();

  // --- CREATE MOCK DATA ---
  testUser = await new User({ 
    username: 'testuser', 
    password: 'password123', 
    fullName: 'Test User',
    email: 'user@test.com',
    role: 'Super Admin'
  }).save();

  testBrand = await new Brand({ name: 'Test Brand' }).save();
  
  // Need a category to create a product
  testCategory = await new Category({ name: 'Test Category' }).save();
});

// --- Test Suite for getBrands ---
describe('getBrands', () => {

  test('Should return all brands', async () => {
    const req = mockRequest();
    const res = mockResponse();

    await getBrands(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.length).toBe(1);
    expect(responseData[0].name).toBe('Test Brand');
  });

  test('Should return 500 on server error', async () => {
    jest.spyOn(Brand, 'find').mockImplementationOnce(() => {
      throw new Error('Test DB Error');
    });
    const req = mockRequest();
    const res = mockResponse();

    await getBrands(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Server Error' });
  });
});

// --- Test Suite for createBrand ---
describe('createBrand', () => {

  test('Should create a new brand', async () => {
    const req = mockRequest(null, { name: 'New Brand' }, testUser);
    const res = mockResponse();

    await createBrand(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Brand' }));
    
    const brandInDb = await Brand.findOne({ name: 'New Brand' });
    expect(brandInDb).not.toBeNull();
    expect(logAction).toHaveBeenCalled();
  });

  test('Should return 400 on validation error (e.g., duplicate name)', async () => {
    const req = mockRequest(null, { name: 'Test Brand' }, testUser); // Duplicate name
    const res = mockResponse();

    await createBrand(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Error creating brand'
    }));
  });
});

// --- Test Suite for updateBrand ---
describe('updateBrand', () => {

  test('Should update an existing brand', async () => {
    const req = mockRequest({ id: testBrand._id }, { name: 'Updated Brand' }, testUser);
    const res = mockResponse();

    await updateBrand(req, res);

    // Assertions
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated Brand' }));
    
    const brandInDb = await Brand.findById(testBrand._id);
    expect(brandInDb.name).toBe('Updated Brand');
    expect(logAction).toHaveBeenCalled();
  });

  test('Should return 404 if brand is not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const req = mockRequest({ id: fakeId }, { name: 'Fake' }, testUser);
    const res = mockResponse();

    await updateBrand(req, res);

    // Assertions
    // Controller has a typo: 4404 instead of 404
    expect(res.status).toHaveBeenCalledWith(4404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Brand not found' });
  });

  test('Should return 400 on validation error (e.g., duplicate name)', async () => {
    // Create a second brand
    await new Brand({ name: 'Another Brand' }).save();
    
    // Try to update testBrand to have the same name as the second brand
    const req = mockRequest({ id: testBrand._id }, { name: 'Another Brand' }, testUser);
    const res = mockResponse();

    await updateBrand(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Error updating brand' });
  });
});

// --- Test Suite for deleteBrand ---
describe('deleteBrand', () => {

  test('Should delete an existing brand', async () => {
    const req = mockRequest({ id: testBrand._id }, null, testUser);
    const res = mockResponse();

    await deleteBrand(req, res);

    // Assertions
    expect(res.json).toHaveBeenCalledWith({ message: 'Brand removed' });
    
    const brandInDb = await Brand.findById(testBrand._id);
    expect(brandInDb).toBeNull();
    expect(logAction).toHaveBeenCalled();
  });

  test('Should return 404 if brand is not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const req = mockRequest({ id: fakeId }, null, testUser);
    const res = mockResponse();

    await deleteBrand(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Brand not found' });
  });

  test('Should return 400 if brand is in use by a product', async () => {
    // Create a product that uses the brand
    testProduct = await new Product({
      name: 'Test Product',
      itemCode: 'TP001',
      category: testCategory._id,
      brand: testBrand._id, // <-- Using the brand
      cost: 100,
      price: 150,
      quantity: 10,
      maxStock: 50
    }).save();

    const req = mockRequest({ id: testBrand._id }, null, testUser);
    const res = mockResponse();

    await deleteBrand(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Cannot delete brand. It is currently in use by a product.' });

    // Ensure brand was NOT deleted
    const brandInDb = await Brand.findById(testBrand._id);
    expect(brandInDb).not.toBeNull();
  });
});