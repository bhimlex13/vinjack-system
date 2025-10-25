const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { loginUser, getAllUsers } = require('../controllers/userController'); // Adjust path
const User = require('../models/userModel'); // Adjust path
const bcrypt = require('bcryptjs');

// --- THIS IS THE FIX ---
// We mock the logger as a simple jest function, matching the CommonJS 'require'
jest.mock('../utils/logger', () => jest.fn());
// ----------------------

// Set a dummy JWT secret for testing
process.env.JWT_SECRET = 'a_secret_key_for_testing';

let mongoServer;

// --- Mock Express Request & Response ---
const mockRequest = (body, params) => ({
  body: body || {},
  params: params || {},
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
// ------------------------------------

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  jest.restoreAllMocks(); // Cleans up any spies we use
});

beforeEach(async () => {
  // Clear and re-seed the DB before each test
  await User.deleteMany({});
  
  // Using REAL bcrypt to create the user, just like your app does.
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);
  
  await new User({ 
    username: 'testuser', 
    password: hashedPassword, // This is now a real hash
    fullName: 'Test User',
    email: 'test@test.com',
    role: 'Owner',
    status: 'active'
  }).save();
});

// --- Test Suite for getAllUsers ---
describe('getAllUsers', () => {

  test('Should return all users without passwords', async () => {
    // Add a second user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('pass456', salt);
    await new User({ 
      username: 'clerkUser', 
      password: hashedPassword,
      fullName: 'Clerk Test',
      email: 'clerk@test.com',
      role: 'Clerk',
      status: 'active'
    }).save();
    
    const req = mockRequest();
    const res = mockResponse();

    // Execute the controller function
    await getAllUsers(req, res);

    // Assertions
    expect(res.json).toHaveBeenCalled(); // Check if res.json() was called
    const responseData = res.json.mock.calls[0][0]; // Get the data sent to res.json()
    
    expect(responseData.length).toBe(2);
    expect(responseData[0].username).toBe('testuser');
    expect(responseData[0].password).toBeUndefined(); // Verify password was stripped
  });
});

// --- Test Suite for loginUser ---
describe('loginUser', () => {

  let bcryptCompareSpy;

  beforeEach(() => {
    // Spy on bcrypt.compare before each login test
    // This lets us control its return value without mocking the whole library
    bcryptCompareSpy = jest.spyOn(bcrypt, 'compare');
  });

  afterEach(() => {
    // Restore the original function after each test
    bcryptCompareSpy.mockRestore();
  });

  test('Should login a user with correct credentials', async () => {
    // Mock that the password comparison is successful
    bcryptCompareSpy.mockResolvedValue(true);

    const req = mockRequest({ username: 'testuser', password: 'password123' });
    const res = mockResponse();

    await loginUser(req, res);

    // Assertions
    expect(res.json).toHaveBeenCalled();
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.username).toBe('testuser');
    expect(responseData.token).toBeDefined(); // Check that a token was generated
  });

  test('Should return 401 for a user that does not exist', async () => {
    const req = mockRequest({ username: 'nouser', password: 'password123' });
    const res = mockResponse();

    await loginUser(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid username or password.' });
  });

  test('Should return 401 for incorrect password', async () => {
    // Mock that the password comparison FAILED
    bcryptCompareSpy.mockResolvedValue(false);
    
    const req = mockRequest({ username: 'testuser', password: 'wrongpassword' });
    const res = mockResponse();

    await loginUser(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid username or password.' });
  });

  test('Should return 403 for an inactive user', async () => {
    // Create an inactive user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    await new User({ 
      username: 'inactiveUser', 
      password: hashedPassword,
      fullName: 'Inactive User',
      email: 'inactive@test.com',
      role: 'Mechanic',
      status: 'inactive'
    }).save();

    // Mock that the password comparison is successful
    bcryptCompareSpy.mockResolvedValue(true);

    const req = mockRequest({ username: 'inactiveUser', password: 'password123' });
    const res = mockResponse();

    await loginUser(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Your account is not active. Please contact an administrator.' });
  });
});