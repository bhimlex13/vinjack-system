const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Counter = require('../models/counterModel'); // Adjust path if needed

let mongoServer;

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
  await Counter.deleteMany({});
});

describe('Counter Model Unit Tests', () => {

  // Test Case 1: Saving a new counter
  test('Should save a new counter with default seq of 0', async () => {
    const validCounterData = {
      _id: 'poNumber', // Using poNumber as the counter ID
    };
    const counter = new Counter(validCounterData);
    const savedCounter = await counter.save();

    // Assertions
    expect(savedCounter._id).toBe('poNumber');
    expect(savedCounter.seq).toBe(0); // Check default value
  });

  // Test Case 2: Saving a counter with a specific seq value
  test('Should save a counter with a specific seq value', async () => {
    const validCounterData = {
      _id: 'invoiceNumber',
      seq: 100,
    };
    const counter = new Counter(validCounterData);
    const savedCounter = await counter.save();

    // Assertions
    expect(savedCounter._id).toBe('invoiceNumber');
    expect(savedCounter.seq).toBe(100);
  });

  // Test Case 3: Failing to save without an '_id'
  test('Should fail to save a counter without an _id', async () => {
    const invalidData = {
      seq: 10,
    };
    const counter = new Counter(invalidData);
    
    let err;
    try {
      await counter.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors._id).toBeDefined();
    expect(err.errors._id.message).toContain('is required');
  });

  // Test Case 4: Failing to save with a duplicate '_id'
  test('Should fail to save with a duplicate _id', async () => {
    // Create the first counter
    const counter1 = new Counter({ _id: 'poNumber', seq: 1 });
    await counter1.save();

    // Try to create the second counter with the same _id
    const counter2 = new Counter({ _id: 'poNumber', seq: 2 });

    let err;
    try {
      await counter2.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeDefined();
    expect(err.code).toBe(11000); // MongoDB duplicate key error code
  });

});