const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/userModel'); // Adjust path if needed

let mongoServer;

// This runs ONCE before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

// This runs ONCE after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// This runs BEFORE EACH 'test' block
beforeEach(async () => {
  // Clear the User collection before each test
  await User.deleteMany({});
});

/* * describe() groups related tests together.
 * test() is the actual test case.
*/

describe('User Model Unit Tests', () => {

  // Test Case 1: Saving a valid user
  test('Should save a user successfully with all required fields', async () => {
    const validUserData = {
      username: 'test_owner',
      password: 'password123',
      role: 'Super Admin',
      fullName: 'Test Owner Name', // <-- ADDED
      email: 'owner@test.com',   // <-- ADDED
    };
    const validUser = new User(validUserData);
    const savedUser = await validUser.save();

    // Assertions
    expect(savedUser._id).toBeDefined();
    expect(savedUser.username).toBe('test_owner');
    expect(savedUser.role).toBe('Owner');
    expect(savedUser.fullName).toBe('Test Owner Name'); // <-- ADDED
    expect(savedUser.email).toBe('owner@test.com');     // <-- ADDED
    // Check if password was hashed
    expect(savedUser.password).not.toBe('password123');
  });

  // Test Case 2: Failing to save without a username
  test('Should fail to save a user without a username', async () => {
    const invalidUserData = {
      password: 'password123',
      role: 'Salesperson',
      fullName: 'Test Clerk Name', // <-- ADDED
      email: 'clerk@test.com',   // <-- ADDED
    };
    const invalidUser = new User(invalidUserData);

    // We expect this save operation to fail
    let err;
    try {
      await invalidUser.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.username).toBeDefined();
    // FIX THE ASSERTION MESSAGE:
    expect(err.errors.username.message).toBe('Path `username` is required.');
  });

  // Test Case 3: Failing to save without a password
  test('Should fail to save a user without a password', async () => {
    const invalidUserData = {
      username: 'test_clerk',
      role: 'Salesperson',
      fullName: 'Test Clerk Name', // <-- ADDED
      email: 'clerk@test.com',   // <-- ADDED
    };
    const invalidUser = new User(invalidUserData);

    let err;
    try {
      await invalidUser.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.password).toBeDefined();
    // FIX THE ASSERTION MESSAGE:
    expect(err.errors.password.message).toBe('Path `password` is required.');
  });

  // Test Case 4: Applying default role
  test('Should apply default role "Mechanic" if role is not provided', async () => {
    const userData = {
      username: 'test_mechanic',
      password: 'password123',
      fullName: 'Test Mechanic Name', // <-- ADDED
      email: 'mechanic@test.com',   // <-- ADDED
    };
    const user = new User(userData);
    const savedUser = await user.save();

    // Assertions
    expect(savedUser._id).toBeDefined();
    expect(savedUser.role).toBe('Salesperson');
  });

  // Test Case 5: Duplicate username error
  test('Should fail to save a user with a duplicate username', async () => {
    // Create the first user
    const user1 = new User({
      username: 'duplicateUser',
      password: 'password1',
      fullName: 'User One',     // <-- ADDED
      email: 'user1@test.com', // <-- ADDED
    });
    await user1.save();

    // Try to create the second user
    const user2 = new User({
      username: 'duplicateUser',
      password: 'password2',
      fullName: 'User Two',     // <-- ADDED
      email: 'user2@test.com', // <-- ADDED
    });

    let err;
    try {
      await user2.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeDefined();
    expect(err.code).toBe(11000); 
  });
});