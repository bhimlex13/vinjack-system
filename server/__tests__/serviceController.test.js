const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
  getServices,
  createService,
  updateService,
  deleteService,
} = require('../controllers/serviceController'); // Adjust path
const Service = require('../models/serviceModel'); // Adjust path
const Sale = require('../models/saleModel'); // Adjust path

// Mock the logger
jest.mock('../utils/logger', () => jest.fn());

// Mock the Sale model specifically for the delete check
jest.mock('../models/saleModel');

let mongoServer;

// --- Mock Express Request & Response ---
const mockRequest = (params, body, user, query) => ({
  params: params || {},
  body: body || {},
  user: user || { id: new mongoose.Types.ObjectId(), name: 'Mock User' },
  query: query || {}, // Added for req.query
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
// ------------------------------------

let testServiceA, testServiceB;

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
  // Clear all collections
  await Service.deleteMany({});
  
  // Clear mocks before each test
  jest.clearAllMocks();

  // Create mock data
  testServiceA = await new Service({
    name: 'Oil Change',
    charge: 50,
    status: 'active',
  }).save();
  testServiceB = await new Service({
    name: 'Tire Repair',
    charge: 30,
    status: 'inactive',
  }).save();
});

// --- Test Suite for getServices ---
describe('getServices', () => {
  test('Should return all services', async () => {
    const req = mockRequest(); // No query
    const res = mockResponse();

    await getServices(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.length).toBe(2);
  });

  test('Should return only active services if status=active', async () => {
    const req = mockRequest({}, {}, {}, { status: 'active' }); // Mock req.query
    const res = mockResponse();

    await getServices(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.length).toBe(1);
    expect(responseData[0].name).toBe('Oil Change');
  });
});

// --- Test Suite for createService ---
describe('createService', () => {
  test('Should create a new service successfully', async () => {
    const req = mockRequest({}, { name: 'New Service', charge: 100 }); // Mock req.body
    const res = mockResponse();

    await createService(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Service', charge: 100 })
    );
    
    // Verify it's in the DB
    const newService = await Service.findOne({ name: 'New Service' });
    expect(newService).toBeDefined();
  });
});

// --- Test Suite for updateService ---
describe('updateService', () => {
  test('Should update a service successfully', async () => {
    const req = mockRequest(
      { id: testServiceA._id }, // params
      { name: 'Updated Oil Change', charge: 55, status: 'inactive' } // body
    );
    const res = mockResponse();

    await updateService(req, res);

    // Assertions
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Updated Oil Change', charge: 55 })
    );

    // Verify it's updated in the DB
    const updatedService = await Service.findById(testServiceA._id);
    expect(updatedService.status).toBe('inactive');
  });

  test('Should return 404 if service to update is not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const req = mockRequest({ id: fakeId }, { name: 'No Service' });
    const res = mockResponse();

    await updateService(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Service not found' });
  });
});

// --- Test Suite for deleteService ---
describe('deleteService', () => {
  test('Should delete a service successfully if not in use', async () => {
    // Mock that Sale.findOne finds NOTHING
    Sale.findOne.mockResolvedValue(null);

    const req = mockRequest({ id: testServiceA._id }); // Mock req.params.id
    const res = mockResponse();

    await deleteService(req, res);

    // Assertions
    expect(res.json).toHaveBeenCalledWith({ message: 'Service removed successfully' });

    // Verify it's gone from the DB
    const deleted = await Service.findById(testServiceA._id);
    expect(deleted).toBeNull();
  });

  test('Should return 400 if service is used in a sale', async () => {
    // Mock that Sale.findOne FINDS a sale
    Sale.findOne.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

    const req = mockRequest({ id: testServiceA._id });
    const res = mockResponse();

    await deleteService(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Cannot delete service. It is used in existing sales records.',
    });

    // Verify it was NOT deleted
    const notDeleted = await Service.findById(testServiceA._id);
    expect(notDeleted).toBeDefined();
  });
});