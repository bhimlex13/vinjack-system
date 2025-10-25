const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Return = require('../models/returnModel'); // Adjust path if needed

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
  await Return.deleteMany({});
});

describe('Return Model Unit Tests', () => {

  // Test Case 1: Saving a valid return (with an item)
  test('Should save a return with an item successfully', async () => {
    const validReturnData = {
      originalSale: new mongoose.Types.ObjectId(),
      itemsReturned: [{
        product: new mongoose.Types.ObjectId(),
        quantity: 1,
        priceAtTime: 150,
      }],
      reason: 'Wrong item purchased',
      outcome: 'Restocked',
      totalRefundAmount: 150,
      recordedBy: new mongoose.Types.ObjectId(),
    };
    const newReturn = new Return(validReturnData);
    const savedReturn = await newReturn.save();

    // Assertions
    expect(savedReturn._id).toBeDefined();
    expect(savedReturn.reason).toBe('Wrong item purchased');
    expect(savedReturn.totalRefundAmount).toBe(150);
    expect(savedReturn.itemsReturned.length).toBe(1);
  });

  // Test Case 2: Saving a valid return (with a service)
  test('Should save a return with a service successfully', async () => {
    const validReturnData = {
      originalSale: new mongoose.Types.ObjectId(),
      servicesReturned: [{
        service: new mongoose.Types.ObjectId(),
        priceAtTime: 300,
      }],
      reason: 'Service not completed',
      outcome: 'Refunded',
      totalRefundAmount: 300,
      recordedBy: new mongoose.Types.ObjectId(),
    };
    const newReturn = new Return(validReturnData);
    const savedReturn = await newReturn.save();

    // Assertions
    expect(savedReturn._id).toBeDefined();
    expect(savedReturn.totalRefundAmount).toBe(300);
    expect(savedReturn.outcome).toBe('Refunded');
    expect(savedReturn.servicesReturned.length).toBe(1);
  });

  // Test Case 3: Checking the default 'outcome'
  test('Should default to "Restocked" if outcome is not provided', async () => {
    const validReturnData = {
      originalSale: new mongoose.Types.ObjectId(),
      itemsReturned: [{
        product: new mongoose.Types.ObjectId(),
        quantity: 1,
        priceAtTime: 150,
      }],
      reason: 'Customer changed mind',
      totalRefundAmount: 150,
      recordedBy: new mongoose.Types.ObjectId(),
    };
    const newReturn = new Return(validReturnData);
    const savedReturn = await newReturn.save();

    // Assertions
    expect(savedReturn.outcome).toBe('Restocked');
  });

  // Test Case 4: Failing to save without 'originalSale'
  test('Should fail to save without an originalSale ID', async () => {
    const invalidData = {
      // originalSale is missing
      itemsReturned: [{
        product: new mongoose.Types.ObjectId(),
        quantity: 1,
        priceAtTime: 150,
      }],
      reason: 'Test fail',
      totalRefundAmount: 150,
      recordedBy: new mongoose.Types.ObjectId(),
    };
    const newReturn = new Return(invalidData);
    
    let err;
    try {
      await newReturn.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.originalSale).toBeDefined();
  });

  // Test Case 5: Failing to save without a 'reason'
  test('Should fail to save without a reason', async () => {
    const invalidData = {
      originalSale: new mongoose.Types.ObjectId(),
      itemsReturned: [{
        product: new mongoose.Types.ObjectId(),
        quantity: 1,
        priceAtTime: 150,
      }],
      // reason is missing
      totalRefundAmount: 150,
      recordedBy: new mongoose.Types.ObjectId(),
    };
    const newReturn = new Return(invalidData);
    
    let err;
    try {
      await newReturn.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.reason).toBeDefined();
    expect(err.errors.reason.message).toBe('A reason for the return is required.');
  });

});