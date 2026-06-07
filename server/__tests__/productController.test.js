const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { getProducts, deleteProduct } = require('../controllers/productController'); // Adjust path
const Product = require('../models/productModel'); // Adjust path
const Category = require('../models/categoryModel'); // Adjust path
const Supplier = require('../models/supplierModel'); // Fix missing schema
const Brand = require('../models/brandModel'); // Adjust path

// Mock the logger
jest.mock('../utils/logger', () => jest.fn());

let mongoServer;

// --- Mock Express Request & Response ---
const mockRequest = (params, body, user) => ({
  params: params || {},
  body: body || {},
  user: user || { id: new mongoose.Types.ObjectId(), name: 'Mock User' }, // Mock req.user
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
// ------------------------------------

let testCategory;
let testBrand;
let testProduct;

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
  await Product.deleteMany({});
  await Category.deleteMany({});
  await Brand.deleteMany({});

  // Create mock data
  testCategory = await new Category({ name: 'Test Category' }).save();
  testBrand = await new Brand({ name: 'Test Brand' }).save();
  testProduct = await new Product({
    name: 'Test Product',
    itemCode: 'TP001',
    category: testCategory._id,
    brand: testBrand._id,
    cost: 100,
    price: 150,
    quantity: 10,
  }).save();
});

// --- Test Suite for getProducts ---
describe('getProducts', () => {

  test('Should return all products with populated category and brand', async () => {
    const req = mockRequest();
    const res = mockResponse();

    await getProducts(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
    
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.length).toBe(1);
    expect(responseData[0].name).toBe('Test Product');
    
    // Check that population worked
    expect(responseData[0].category).toBeDefined();
    expect(responseData[0].category.name).toBe('Test Category');
    expect(responseData[0].brand).toBeDefined();
    expect(responseData[0].brand.name).toBe('Test Brand');
  });
});

// --- Test Suite for deleteProduct ---
describe('deleteProduct', () => {

  test('Should delete a product successfully', async () => {
    const req = mockRequest({ id: testProduct._id }); // Mock req.params.id
    const res = mockResponse();

    await deleteProduct(req, res);

    // Assertions
    expect(res.json).toHaveBeenCalledWith({ message: 'Product removed' });
    
    // Verify it's actually gone from the DB
    const deleted = await Product.findById(testProduct._id);
    expect(deleted).toBeNull();
  });

  test('Should return 404 if product to delete is not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const req = mockRequest({ id: fakeId }); // Mock a valid but non-existent ID
    const res = mockResponse();

    await deleteProduct(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Product not found' });
  });

});