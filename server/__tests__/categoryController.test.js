const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController'); // Adjust path
const Category = require('../models/categoryModel'); // Adjust path
const Product = require('../models/productModel'); // Adjust path
const User = require('../models/userModel'); // Adjust path
const Brand = require('../models/brandModel'); // Adjust path

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

let testCategory, testUser, testProduct, testBrand;

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
  await Category.deleteMany({});
  await Product.deleteMany({});
  await User.deleteMany({});
  await Brand.deleteMany({});

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

  testCategory = await new Category({ name: 'Test Category', description: 'A test desc' }).save();
  
  // Need a brand to create a product
  testBrand = await new Brand({ name: 'Test Brand' }).save();
});

// --- Test Suite for getCategories ---
describe('getCategories', () => {

  test('Should return all categories', async () => {
    const req = mockRequest();
    const res = mockResponse();

    await getCategories(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.length).toBe(1);
    expect(responseData[0].name).toBe('Test Category');
  });

  test('Should return 500 on server error', async () => {
    jest.spyOn(Category, 'find').mockImplementationOnce(() => {
      throw new Error('Test DB Error');
    });
    const req = mockRequest();
    const res = mockResponse();

    await getCategories(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Server Error' });
  });
});

// --- Test Suite for createCategory ---
describe('createCategory', () => {

  test('Should create a new category', async () => {
    const req = mockRequest(null, { name: 'New Category', description: 'A new desc' }, testUser);
    const res = mockResponse();

    await createCategory(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Category' }));
    
    const categoryInDb = await Category.findOne({ name: 'New Category' });
    expect(categoryInDb).not.toBeNull();
    expect(categoryInDb.description).toBe('A new desc');
    expect(logAction).toHaveBeenCalled();
  });

  test('Should return 400 on validation error (e.g., duplicate name)', async () => {
    const req = mockRequest(null, { name: 'Test Category' }, testUser); // Duplicate name
    const res = mockResponse();

    await createCategory(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Error creating category'
    }));
  });
});

// --- Test Suite for updateCategory ---
describe('updateCategory', () => {

  test('Should update an existing category', async () => {
    const req = mockRequest({ id: testCategory._id }, { name: 'Updated Category', description: 'Updated' }, testUser);
    const res = mockResponse();

    await updateCategory(req, res);

    // Assertions
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated Category', description: 'Updated' }));
    
    const categoryInDb = await Category.findById(testCategory._id);
    expect(categoryInDb.name).toBe('Updated Category');
    expect(logAction).toHaveBeenCalled();
  });

  test('Should return 404 if category is not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const req = mockRequest({ id: fakeId }, { name: 'Fake' }, testUser);
    const res = mockResponse();

    await updateCategory(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Category not found' });
  });

  test('Should return 400 on validation error (e.g., duplicate name)', async () => {
    // Create a second category
    await new Category({ name: 'Another Category' }).save();
    
    // Try to update testCategory to have the same name as the second one
    const req = mockRequest({ id: testCategory._id }, { name: 'Another Category' }, testUser);
    const res = mockResponse();

    await updateCategory(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Error updating category' });
  });
});

// --- Test Suite for deleteCategory ---
describe('deleteCategory', () => {

  test('Should delete an existing category', async () => {
    const req = mockRequest({ id: testCategory._id }, null, testUser);
    const res = mockResponse();

    await deleteCategory(req, res);

    // Assertions
    expect(res.json).toHaveBeenCalledWith({ message: 'Category removed' });
    
    const categoryInDb = await Category.findById(testCategory._id);
    expect(categoryInDb).toBeNull();
    expect(logAction).toHaveBeenCalled();
  });

  test('Should return 404 if category is not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const req = mockRequest({ id: fakeId }, null, testUser);
    const res = mockResponse();

    await deleteCategory(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Category not found' });
  });

  test('Should return 400 if category is in use by a product', async () => {
    // Create a product that uses the category
    testProduct = await new Product({
      name: 'Test Product',
      itemCode: 'TP001',
      category: testCategory._id, // <-- Using the category
      brand: testBrand._id,
      cost: 100,
      price: 150,
      quantity: 10,
      maxStock: 50
    }).save();

    const req = mockRequest({ id: testCategory._id }, null, testUser);
    const res = mockResponse();

    await deleteCategory(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Cannot delete category. It is currently in use by a product.' });

    // Ensure category was NOT deleted
    const categoryInDb = await Category.findById(testCategory._id);
    expect(categoryInDb).not.toBeNull();
  });
});