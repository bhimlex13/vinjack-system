// __tests__/deliveryController.test.js

// --- FIX 1: Increase timeout to 2 minutes (120 seconds) ---
jest.setTimeout(120000); 

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createDelivery, getDeliveries } = require('../controllers/deliveryController'); // Adjust path
const Delivery = require('../models/deliveryModel'); // Adjust path
const Product = require('../models/productModel'); // Adjust path
const Supplier = require('../models/supplierModel'); // Adjust path
const User = require('../models/userModel'); // Adjust path
const Category = require('../models/categoryModel'); // Adjust path
const Brand = require('../models/brandModel'); // Adjust path

// --- Mock all utilities used by the controller ---
jest.mock('../utils/logger', () => jest.fn());
jest.mock('../utils/movementLogger', () => jest.fn());
jest.mock('../utils/stockManager', () => ({
  checkStockLevelAndNotify: jest.fn(),
}));

let mongoServer;

// --- Mock Express Request & Response ---
const mockRequest = (params, body, user) => {
  const req = {
    params: params || {},
    body: body || {},
    user: user || { id: new mongoose.Types.ObjectId(), name: 'Mock User' },
  };
  // Mock req.app.get('socketio') for stockManager
  req.app = { get: jest.fn(() => ({})) }; 
  return req;
};

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
// ------------------------------------

let testUser, testSupplier, testProductA;

beforeAll(async () => {
  // Start the in-memory server as a replica set to support transactions
  mongoServer = await MongoMemoryServer.create({
    instance: {
      replSet: 'test-rs' // 'test-rs' is just a name
    }
  });
  
  const mongoUri = mongoServer.getUri();
  
  // --- THIS IS THE FINAL FIX ---
  // Tell Mongoose to wait longer for the replica set to be ready
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 60000 // 60 seconds
  });
  // --- END FIX ---
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  jest.restoreAllMocks();
});

beforeEach(async () => {
  // Clear all relevant collections
  await Delivery.deleteMany({});
  await Product.deleteMany({});
  await Supplier.deleteMany({});
  await User.deleteMany({});
  await Category.deleteMany({});
  await Brand.deleteMany({});

  // Reset mocks before each test
  jest.clearAllMocks();

  // --- Create mock data ---
  testUser = await new User({
    username: 'testmanager',
    password: 'hashedpassword',
    fullName: 'Test Manager',
    email: 'manager@test.com',
    role: 'Owner',
    status: 'active'
  }).save();

  testSupplier = await new Supplier({
    name: 'Test Supplier',
    email: 'supplier@test.com',
  }).save();

  const testCategory = await new Category({ name: 'Test Category' }).save();
  const testBrand = await new Brand({ name: 'Test Brand' }).save();

  testProductA = await new Product({
    name: 'Product A',
    itemCode: 'A01',
    price: 100,
    cost: 50,
    quantity: 10, // Start with 10 in stock
    category: testCategory._id,
    brand: testBrand._id,
    // --- FIX 2: Add the required 'maxStock' field ---
    maxStock: 100 
  }).save();
});

// --- Test Suite for getDeliveries ---
describe('getDeliveries', () => {
  test('Should return all deliveries with populated data', async () => {
    // Create a sample delivery for this test
    await new Delivery({
      supplier: testSupplier._id,
      productsReceived: [{ product: testProductA._id, quantity: 5, costAtTime: 50 }],
      totalCost: 250,
      recordedBy: testUser._id,
    }).save();

    const req = mockRequest();
    const res = mockResponse();

    await getDeliveries(req, res);

    // Assertions
    expect(res.json).toHaveBeenCalled();
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.length).toBe(1);
    expect(responseData[0].supplier.name).toBe('Test Supplier');
    expect(responseData[0].recordedBy.fullName).toBe('Test Manager');
    expect(responseData[0].productsReceived[0].product.name).toBe('Product A');
  });
});

// --- Test Suite for createDelivery ---
describe('createDelivery', () => {
  test('Should create a new delivery, INCREASE stock, and update cost', async () => {
    // Product A starts with 10 stock @ 50 cost.
    // We are delivering 5 more @ 60 cost.
    const deliveryPayload = {
      supplier: testSupplier._id,
      productsReceived: [
        { product: testProductA._id, quantity: 5, costAtTime: 60 }
      ],
      totalCost: 300, // 5 * 60
    };

    const req = mockRequest({}, deliveryPayload, testUser);
    const res = mockResponse();

    await createDelivery(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ totalCost: 300 })
    );

    // Verify stock was INCREASED
    const updatedProduct = await Product.findById(testProductA._id);
    expect(updatedProduct.quantity).toBe(15); // 10 (start) + 5 (delivered)
    
    // Verify cost was UPDATED
    expect(updatedProduct.cost).toBe(60);

    // Verify movementLogger was called
    const logMovement = require('../utils/movementLogger');
    expect(logMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        product: testProductA._id,
        type: 'DELIVERY',
        quantityChange: 5,
        stockBefore: 10,
      }),
      expect.any(Object) // For the { session } object
    );
  });

  test('Should return 400 if product in delivery is not found', async () => {
    const fakeProductId = new mongoose.Types.ObjectId();
    const deliveryPayload = {
      supplier: testSupplier._id,
      productsReceived: [
        { product: fakeProductId, quantity: 5, costAtTime: 60 }
      ],
    };

    const req = mockRequest({}, deliveryPayload, testUser);
    const res = mockResponse();

    await createDelivery(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: `Product with ID ${fakeProductId} not found.`,
    });

    // Verify stock was NOT changed
    const originalProduct = await Product.findById(testProductA._id);
    expect(originalProduct.quantity).toBe(10);
  });
});