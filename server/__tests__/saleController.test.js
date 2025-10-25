const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { getAllSales, getSaleById } = require('../controllers/saleController'); // Adjust path
const Sale = require('../models/saleModel'); // Adjust path
const Product = require('../models/productModel'); // Adjust path
const Service = require('../models/serviceModel'); // Adjust path
const User = require('../models/userModel'); // Adjust path
const Category = require('../models/categoryModel'); // Adjust path
const Brand = require('../models/brandModel'); // Adjust path

// Mock the logger utility
jest.mock('../utils/logger', () => jest.fn());

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

let testUser, testProduct, testService, testSale;

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
  await Sale.deleteMany({});
  await Product.deleteMany({});
  await Service.deleteMany({});
  await User.deleteMany({});
  await Category.deleteMany({});
  await Brand.deleteMany({});

  // --- CREATE ALL REQUIRED MOCK DATA ---
  testUser = await new User({ 
    username: 'testClerk', 
    password: 'password123', 
    fullName: 'Test Clerk',
    email: 'clerk@test.com',
    role: 'Clerk',
    status: 'active'
  }).save();
  
  // Create category and brand FIRST
  const testCategory = await new Category({ name: 'Test Category' }).save();
  const testBrand = await new Brand({ name: 'Test Brand' }).save();

  // NOW we can create a valid product
  testProduct = await new Product({ 
    name: 'Test Product', 
    itemCode: 'TP001',
    category: testCategory._id, // <-- ADDED
    brand: testBrand._id,       // <-- ADDED
    cost: 100, 
    price: 150, 
    quantity: 10 
  }).save();
  
  testService = await new Service({ 
    name: 'Test Service', 
    charge: 50 
  }).save();

  // NOW we can create a valid sale
  testSale = await new Sale({
    recordedBy: testUser._id,
    items: [{
      product: testProduct._id,
      quantity: 2,
      priceAtTime: 150,
      costAtTime: 100,
    }],
    services: [{
      service: testService._id,
      priceAtTime: 50,
    }],
    totalAmount: 350,
  }).save();
});

// --- Test Suite for getAllSales ---
describe('getAllSales', () => {

  test('Should return all sales with populated data', async () => {
    const req = mockRequest();
    const res = mockResponse();

    await getAllSales(req, res);

    // Assertions
    expect(res.json).toHaveBeenCalled();
    const responseData = res.json.mock.calls[0][0];
    
    expect(responseData.length).toBe(1);
    expect(responseData[0].totalAmount).toBe(350);
    
    // Check that population worked
    expect(responseData[0].recordedBy.fullName).toBe('Test Clerk');
    expect(responseData[0].items[0].product.name).toBe('Test Product');
    expect(responseData[0].services[0].service.name).toBe('Test Service');
  });
});

// --- Test Suite for getSaleById ---
describe('getSaleById', () => {

  test('Should return a single sale by its ID', async () => {
    const req = mockRequest({ id: testSale._id }); // Mock req.params.id
    const res = mockResponse();

    await getSaleById(req, res);

    // Assertions
    expect(res.json).toHaveBeenCalled();
    const responseData = res.json.mock.calls[0][0];
    
    expect(responseData.totalAmount).toBe(350);
    expect(responseData.recordedBy.fullName).toBe('Test Clerk');
    expect(responseData.items[0].product.name).toBe('Test Product');
  });

  test('Should return 404 if sale is not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const req = mockRequest({ id: fakeId }); // Mock a valid but non-existent ID
    const res = mockResponse();

    await getSaleById(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Sale not found.' });
  });

});