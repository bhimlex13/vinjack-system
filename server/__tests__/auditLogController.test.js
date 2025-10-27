const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { getLogs } = require('../controllers/auditLogController'); // Adjust path
const AuditLog = require('../models/auditLogModel'); // Adjust path
const User = require('../models/userModel'); // Adjust path

let mongoServer;

// --- Mock Express Request & Response ---
const mockRequest = (query, user) => ({
  query: query || {},
  user: user || { id: new mongoose.Types.ObjectId(), name: 'Mock User' },
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
// ------------------------------------

let testUser1, testUser2;

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
  await AuditLog.deleteMany({});
  await User.deleteMany({});

  // --- CREATE MOCK DATA ---
  testUser1 = await new User({ 
    username: 'userone', 
    password: 'password123', 
    fullName: 'Test User One',
    email: 'user1@test.com',
    role: 'Clerk',
    status: 'active'
  }).save();
  
  testUser2 = await new User({ 
    username: 'usertwo', 
    password: 'password123', 
    fullName: 'Test User Two',
    email: 'user2@test.com',
    role: 'Owner',
    status: 'active'
  }).save();

  // Create mock logs, manually setting createdAt for predictable sorting
  await new AuditLog({
    user: testUser1._id,
    action: 'LOGIN',
    details: 'User one logged in.',
    createdAt: new Date('2024-10-01T10:00:00.000Z')
  }).save();

  await new AuditLog({
    user: testUser1._id,
    action: 'CREATE_PRODUCT',
    details: 'User one created product: Test Product A',
    createdAt: new Date('2024-10-01T11:00:00.000Z')
  }).save();

  await new AuditLog({
    user: testUser2._id,
    action: 'PROCESS_SALE',
    details: 'User two processed sale #1001',
    createdAt: new Date('2024-10-01T12:00:00.000Z')
  }).save();

  await new AuditLog({
    user: testUser2._id,
    action: 'CREATE_PRODUCT',
    details: 'User two created product: Test Product B',
    createdAt: new Date('2024-10-01T13:00:00.000Z')
  }).save();
});

// --- Test Suite for getLogs ---
describe('getLogs', () => {

  test('Should return all logs, paginated, with populated user data', async () => {
    const req = mockRequest({ page: 1, limit: 10 });
    const res = mockResponse();

    await getLogs(req, res);

    // Assertions
    expect(res.json).toHaveBeenCalled();
    const responseData = res.json.mock.calls[0][0];
    
    expect(responseData.logs.length).toBe(4);
    expect(responseData.totalLogs).toBe(4);
    expect(responseData.currentPage).toBe(1);
    
    // Check sorting (newest first) and population
    expect(responseData.logs[0].action).toBe('CREATE_PRODUCT');
    expect(responseData.logs[0].user.fullName).toBe('Test User Two');
    expect(responseData.logs[3].action).toBe('LOGIN');
    expect(responseData.logs[3].user.fullName).toBe('Test User One');
  });

  test('Should filter by userId', async () => {
    const req = mockRequest({ userId: testUser1._id });
    const res = mockResponse();

    await getLogs(req, res);

    // Assertions
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.logs.length).toBe(2);
    expect(responseData.totalLogs).toBe(2);
    expect(responseData.logs[0].user.fullName).toBe('Test User One');
  });

  test('Should filter by action', async () => {
    const req = mockRequest({ action: 'CREATE_PRODUCT' });
    const res = mockResponse();

    await getLogs(req, res);

    // Assertions
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.logs.length).toBe(2);
    expect(responseData.totalLogs).toBe(2);
  });

  test('Should filter by search (case-insensitive)', async () => {
    const req = mockRequest({ search: 'product' }); // Should match 'product'
    const res = mockResponse();

    await getLogs(req, res);

    // Assertions
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.logs.length).toBe(2);
    expect(responseData.totalLogs).toBe(2);
  });

  test('Should filter by search with specific term', async () => {
    const req = mockRequest({ search: 'sale #1001' }); // Should match specific sale
    const res = mockResponse();

    await getLogs(req, res);

    // Assertions
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.logs.length).toBe(1);
    expect(responseData.totalLogs).toBe(1);
    expect(responseData.logs[0].action).toBe('PROCESS_SALE');
  });

  test('Should handle pagination correctly', async () => {
    const req = mockRequest({ page: 2, limit: 2 });
    const res = mockResponse();

    await getLogs(req, res);

    // Assertions
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.logs.length).toBe(2);
    expect(responseData.totalLogs).toBe(4);
    expect(responseData.currentPage).toBe(2);
    expect(responseData.totalPages).toBe(2);
    
    // Check that we got the older logs
    expect(responseData.logs[0].action).toBe('CREATE_PRODUCT');
    expect(responseData.logs[0].user.fullName).toBe('Test User One');
  });

  test('Should handle combined filters (userId and action)', async () => {
    const req = mockRequest({ userId: testUser1._id, action: 'LOGIN' });
    const res = mockResponse();

    await getLogs(req, res);

    // Assertions
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.logs.length).toBe(1);
    expect(responseData.totalLogs).toBe(1);
  });

  test('Should return 500 on server error', async () => {
    // Force an error
    jest.spyOn(AuditLog, 'find').mockImplementationOnce(() => {
      throw new Error('Test DB Error');
    });

    const req = mockRequest({});
    const res = mockResponse();

    await getLogs(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Server Error' });
  });
});