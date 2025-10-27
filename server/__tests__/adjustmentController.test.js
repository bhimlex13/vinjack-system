const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createStockAdjustment } = require('../controllers/adjustmentController'); // Adjust path
const Product = require('../models/productModel'); // Adjust path
const User = require('../models/userModel'); // Adjust path
const Category = require('../models/categoryModel'); // Adjust path
const Brand = require('../models/brandModel'); // Adjust path

// --- Mock Utilities ---
// Mock the logger utility (default export)
jest.mock('../utils/logger', () => jest.fn());
// Mock the movementLogger utility (named export)
jest.mock('../utils/movementLogger', () => jest.fn());

// --- *** FIX: Updated stockManager mock *** ---
// Mock the stockManager utility (named export)
jest.mock('../utils/stockManager', () => ({
  // We mock checkStockLevelAndNotify to *actually save* the product
  // This simulates the real function's behavior
  checkStockLevelAndNotify: jest.fn(async (product, io) => {
    return product.save(); // This returns the saved product
  }),
}));
// --- *** END FIX *** ---

// Import the mocked functions to check calls
const logAction = require('../utils/logger');
const logMovement = require('../utils/movementLogger');
const { checkStockLevelAndNotify } = require('../utils/stockManager');
// -----------------------

let mongoServer;

// --- Mock Express Request & Response ---
const mockRequest = (body, user) => ({
  body: body || {},
  user: user || { id: new mongoose.Types.ObjectId(), name: 'Mock User' },
  // Add mock for req.app.get('socketio')
  app: {
    get: jest.fn((key) => {
      if (key === 'socketio') {
        return { emit: jest.fn() }; // Mock io object with an emit function
      }
      return null;
    }),
  },
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
// ------------------------------------

// --- Test Data Variables ---
let testUser, testCategory, testBrand, testProduct;

beforeAll(async () => {
  // This controller doesn't use transactions, so we don't need the replica set.
  // This will make startup much faster.
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
  await User.deleteMany({});
  await Category.deleteMany({});
  await Brand.deleteMany({});

  // Reset mocks
  jest.clearAllMocks();

  // --- CREATE ALL REQUIRED MOCK DATA ---
  testUser = await new User({
    username: 'testClerk',
    password: 'password123',
    fullName: 'Test Clerk',
    email: 'clerk@test.com',
    role: 'Clerk',
    status: 'active'
  }).save();
  
  testCategory = await new Category({ name: 'Test Category' }).save();
  testBrand = await new Brand({ name: 'Test Brand' }).save();

  testProduct = await new Product({
    name: 'Test Product',
    itemCode: 'TP001',
    category: testCategory._id,
    brand: testBrand._id,
    cost: 80,
    price: 150,
    quantity: 10, // Initial stock
    maxStock: 50
  }).save();
});

// --- Test Suite for createStockAdjustment ---
describe('createStockAdjustment', () => {

  test('Should successfully INCREASE stock', async () => {
    const reqBody = {
      productId: testProduct._id,
      adjustmentType: 'increase',
      quantity: 5,
      reason: 'Found extra stock'
    };
    const req = mockRequest(reqBody, testUser);
    const res = mockResponse();

    await createStockAdjustment(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Stock adjusted successfully.',
      product: expect.any(Object)
    });
    
    // Check product in DB
    const updatedProduct = await Product.findById(testProduct._id);
    expect(updatedProduct.quantity).toBe(15); // 10 + 5

    // Check mocks were called
    expect(checkStockLevelAndNotify).toHaveBeenCalled();
    expect(logMovement).toHaveBeenCalledWith(expect.objectContaining({
      quantityChange: 5,
      stockBefore: 10,
      type: 'ADJUSTMENT'
    }));
    expect(logAction).toHaveBeenCalled();
  });

  test('Should successfully DECREASE stock', async () => {
    const reqBody = {
      productId: testProduct._id,
      adjustmentType: 'decrease',
      quantity: 3,
      reason: 'Damaged items'
    };
    const req = mockRequest(reqBody, testUser);
    const res = mockResponse();

    await createStockAdjustment(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(200);
    
    // Check product in DB
    const updatedProduct = await Product.findById(testProduct._id);
    expect(updatedProduct.quantity).toBe(7); // 10 - 3

    // Check mocks were called
    expect(checkStockLevelAndNotify).toHaveBeenCalled();
    expect(logMovement).toHaveBeenCalledWith(expect.objectContaining({
      quantityChange: -3,
      stockBefore: 10,
      type: 'ADJUSTMENT'
    }));
    expect(logAction).toHaveBeenCalled();
  });

  test('Should return 400 if DECREASE quantity is more than available stock', async () => {
    const reqBody = {
      productId: testProduct._id,
      adjustmentType: 'decrease',
      quantity: 11, // Only 10 in stock
      reason: 'Too many'
    };
    const req = mockRequest(reqBody, testUser);
    const res = mockResponse();

    await createStockAdjustment(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Cannot decrease stock by 11. Only 10 available.' });

    // Check product in DB (should be unchanged)
    const product = await Product.findById(testProduct._id);
    expect(product.quantity).toBe(10);
    
    // Check mocks were NOT called
    expect(checkStockLevelAndNotify).not.toHaveBeenCalled();
    expect(logMovement).not.toHaveBeenCalled();
    expect(logAction).not.toHaveBeenCalled();
  });

  test('Should return 404 if product is not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const reqBody = {
      productId: fakeId,
      adjustmentType: 'increase',
      quantity: 5,
      reason: 'Test'
    };
    const req = mockRequest(reqBody, testUser);
    const res = mockResponse();

    await createStockAdjustment(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Product not found.' });
  });

  test('Should return 400 for missing required fields', async () => {
    const reqBody = {
      productId: testProduct._id,
      adjustmentType: 'increase',
      // quantity is missing (undefined)
      reason: 'Test'
    };
    const req = mockRequest(reqBody, testUser);
    const res = mockResponse();

    await createStockAdjustment(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Product, adjustment type, quantity, and reason are required.' });
  });

  test('Should return 400 for invalid quantity (0 or less)', async () => {
    const reqBody = {
      productId: testProduct._id,
      adjustmentType: 'increase',
      quantity: 0,
      reason: 'Test'
    };
    const req = mockRequest(reqBody, testUser);
    const res = mockResponse();

    await createStockAdjustment(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(400);
    // This now passes because the controller validation is fixed
    expect(res.json).toHaveBeenCalledWith({ message: 'Quantity must be a positive number.' });
  });

  test('Should return 400 for invalid adjustment type', async () => {
    const reqBody = {
      productId: testProduct._id,
      adjustmentType: 'sideways', // Invalid type
      quantity: 5,
      reason: 'Test'
    };
    const req = mockRequest(reqBody, testUser);
    const res = mockResponse();

    await createStockAdjustment(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid adjustment type. Must be 'increase' or 'decrease'." });
  });

  test('Should return 500 on server error', async () => {
    // Force Product.findById to fail
    jest.spyOn(Product, 'findById').mockImplementationOnce(() => {
      throw new Error('Test DB Error');
    });

    const reqBody = {
      productId: testProduct._id,
      adjustmentType: 'increase',
      quantity: 5,
      reason: 'Test'
    };
    const req = mockRequest(reqBody, testUser);
    const res = mockResponse();

    await createStockAdjustment(req, res);

    // Assertions
    // This now passes because the controller status code is fixed
    expect(res.status).toHaveBeenCalledWith(500); 
    expect(res.json).toHaveBeenCalledWith({ 
      message: 'Server error while adjusting stock.',
      error: 'Test DB Error' 
    });
  });
});