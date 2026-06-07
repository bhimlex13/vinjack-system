// __tests__/purchaseOrderController.test.js

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
  createPurchaseOrder,
  getAllPurchaseOrders,
  getPurchaseOrderById,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} = require('../controllers/purchaseOrderController'); // Adjust path
const PurchaseOrder = require('../models/purchaseOrderModel'); // Adjust path
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

// --- THIS IS THE FIX ---
jest.mock('../utils/emailService', () => ({
  sendPoLink: jest.fn().mockResolvedValue(), // Returns a resolved Promise
}));
// --- END FIX ---

// --- THIS MOCK IS CORRECT ---
jest.mock('../models/counterModel');
// ----------------------------

// This will now import Jest's auto-mocked version of Counter
const Counter = require('../models/counterModel');

let mongoServer;

// --- Mock Express Request & Response ---
const mockRequest = (params, body, user, file) => {
  const req = {
    params: params || {},
    body: body || {},
    user: user || { id: new mongoose.Types.ObjectId(), name: 'Mock User' },
    file: file || null,
  };
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

let testUser, testSupplier, testProductA, testApprovedPO, testPendingPO;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  jest.restoreAllMocks();
});

beforeEach(async () => {
  // Clear all relevant collections
  await PurchaseOrder.deleteMany({});
  await Product.deleteMany({});
  await Supplier.deleteMany({});
  await User.deleteMany({});
  await Category.deleteMany({});
  await Brand.deleteMany({});

  // Reset mocks before each test
  jest.clearAllMocks();

  // --- THIS IS THE NEW FIX ---
  // We provide a smart mock implementation that runs *before*
  // any tests. It will handle all calls to findByIdAndUpdate.
  Counter.findByIdAndUpdate.mockImplementation((id, update, options) => {
    if (id === 'purchaseOrder') {
      // This is for the createPurchaseOrder test
      return Promise.resolve({ seq: 3 }); 
    }
    // This is for any other counter (like 'product' in Product.save())
    return Promise.resolve({ seq: 1 }); 
  });
  // --- END NEW FIX ---

  testUser = await new User({
    username: 'testmanager',
    password: 'hashedpassword',
    fullName: 'Test Manager',
    email: 'manager@test.com',
    role: 'Super Admin',
    status: 'active'
  }).save();

  testSupplier = await new Supplier({
    name: 'Test Supplier',
    contactPerson: 'Mr. Test',
    email: 'supplier@test.com',
  }).save();

  const testCategory = await new Category({ name: 'Test Category' }).save();
  const testBrand = await new Brand({ name: 'Test Brand' }).save();

  testProductA = await new Product({
    name: 'Product A',
    itemCode: 'A01', // This 'A01' implies a counter isn't used or is handled
    price: 100,
    cost: 50,
    quantity: 10,
    category: testCategory._id,
    brand: testBrand._id,
  }).save();

  testApprovedPO = await new PurchaseOrder({
    poNumber: 'PO-2025-0001',
    supplier: testSupplier._id,
    items: [{ product: testProductA._id, quantity: 5, cost: 50, total: 250 }],
    totalAmount: 250,
    status: 'Approved',
    history: [{ status: 'Approved' }],
    supplierResponseToken: 'token123',
  }).save();

  testPendingPO = await new PurchaseOrder({
    poNumber: 'PO-2025-0002',
    supplier: testSupplier._id,
    items: [{ product: testProductA._id, quantity: 2, cost: 50, total: 100 }],
    totalAmount: 100,
    status: 'Pending',
    history: [{ status: 'Pending' }],
    supplierResponseToken: 'token456',
  }).save();
});

// --- Test Suite for createPurchaseOrder ---
describe('createPurchaseOrder', () => {
  test('Should create a new PO and send an email', async () => {
    // Mock setup is now fully handled in beforeEach
    
    const poPayload = {
      supplier: testSupplier._id,
      items: [{ product: testProductA._id, quantity: 3, unitCost: 50 }],
      notes: 'Test PO creation',
    };

    const req = mockRequest({}, poPayload, testUser);
    const res = mockResponse();

    await createPurchaseOrder(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        poNumber: 'PO-2025-0003', // This will now match seq: 3
        totalAmount: 150,
        status: 'Pending',
      })
    );
    expect(require('../utils/emailService').sendPoLink).toHaveBeenCalled();
  });
});

// --- Test Suite for getAllPurchaseOrders ---
describe('getAllPurchaseOrders', () => {
  test('Should return all POs with populated data', async () => {
    const req = mockRequest();
    const res = mockResponse();

    await getAllPurchaseOrders(req, res);

    expect(res.json).toHaveBeenCalled();
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.length).toBe(2);
    expect(responseData[0].supplier.name).toBe('Test Supplier');
  });
});

// --- Test Suite for getPurchaseOrderById ---
describe('getPurchaseOrderById', () => {
  test('Should return a single PO by ID', async () => {
    const req = mockRequest({ id: testApprovedPO._id });
    const res = mockResponse();

    await getPurchaseOrderById(req, res);

    expect(res.json).toHaveBeenCalled();
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.poNumber).toBe('PO-2025-0001');
    expect(responseData.items[0].product.name).toBe('Product A');
  });

  test('Should return 404 if PO is not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const req = mockRequest({ id: fakeId });
    const res = mockResponse();

    await getPurchaseOrderById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// --- Test Suite for receivePurchaseOrder ---
describe('receivePurchaseOrder', () => {
  test('Should receive stock, update PO to "Completed", and INCREASE stock', async () => {
    const itemsToReceive = [
      { productId: testProductA._id.toString(), quantityReceived: 5 },
    ];
    
    const req = mockRequest(
      { id: testApprovedPO._id },
      { items: JSON.stringify(itemsToReceive) },
      testUser
    );
    const res = mockResponse();

    await receivePurchaseOrder(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Stock received and inventory updated successfully!',
      })
    );
    expect(res.json.mock.calls[0][0].purchaseOrder.status).toBe('Completed');

    const updatedProduct = await Product.findById(testProductA._id);
    expect(updatedProduct.quantity).toBe(15);
  });

  test('Should partially receive stock and update PO to "Partially Received"', async () => {
    const itemsToReceive = [
      { productId: testProductA._id.toString(), quantityReceived: 2 },
    ];
    
    const req = mockRequest(
      { id: testApprovedPO._id },
      { items: JSON.stringify(itemsToReceive) },
      testUser
    );
    const res = mockResponse();

    await receivePurchaseOrder(req, res);

    expect(res.json.mock.calls[0][0].purchaseOrder.status).toBe('Partially Received');
    const updatedProduct = await Product.findById(testProductA._id);
    expect(updatedProduct.quantity).toBe(12);
  });

  test('Should return 400 if PO status is not "Approved"', async () => {
    const itemsToReceive = [
      { productId: testProductA._id.toString(), quantityReceived: 2 },
    ];
    
    const req = mockRequest(
      { id: testPendingPO._id },
      { items: JSON.stringify(itemsToReceive) },
      testUser
    );
    const res = mockResponse();

    await receivePurchaseOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Cannot receive stock for a PO with status 'Pending'.",
    });

    const updatedProduct = await Product.findById(testProductA._id);
    expect(updatedProduct.quantity).toBe(10);
  });
});

// --- Test Suite for cancelPurchaseOrder ---
describe('cancelPurchaseOrder', () => {
  test('Should cancel a "Pending" PO successfully', async () => {
    const req = mockRequest({ id: testPendingPO._id }, {}, testUser);
    const res = mockResponse();

    await cancelPurchaseOrder(req, res);

    expect(res.json).toHaveBeenCalledWith({
      message: 'Purchase Order cancelled successfully.',
    });
    
    const cancelledPO = await PurchaseOrder.findById(testPendingPO._id);
    expect(cancelledPO.status).toBe('Cancelled');
  });
});