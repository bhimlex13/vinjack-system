const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Delivery = require('../models/deliveryModel'); // Adjust path if needed

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
  await Delivery.deleteMany({});
});

describe('Delivery Model Unit Tests', () => {

  // Test Case 1: Saving a valid delivery
  test('Should save a delivery successfully with all required fields', async () => {
    const validDeliveryData = {
      purchaseOrder: new mongoose.Types.ObjectId(),
      productsReceived: [{
        product: new mongoose.Types.ObjectId(),
        quantity: 10,
        costAtTime: 100,
      }],
      totalCost: 1000,
      recordedBy: new mongoose.Types.ObjectId(),
    };
    const delivery = new Delivery(validDeliveryData);
    const savedDelivery = await delivery.save();

    // Assertions
    expect(savedDelivery._id).toBeDefined();
    expect(savedDelivery.productsReceived.length).toBe(1);
    expect(savedDelivery.productsReceived[0].quantity).toBe(10);
    expect(savedDelivery.totalCost).toBe(1000);
    expect(savedDelivery.deliveryDate).toBeInstanceOf(Date); // Check default
  });

  // Test Case 2: Failing to save without 'recordedBy'
  test('Should fail to save a delivery without a recordedBy user', async () => {
    const invalidData = {
      productsReceived: [{
        product: new mongoose.Types.ObjectId(),
        quantity: 5,
        costAtTime: 50,
      }],
    };
    const delivery = new Delivery(invalidData);
    
    let err;
    try {
      await delivery.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.recordedBy).toBeDefined();
    expect(err.errors.recordedBy.message).toBe('Path `recordedBy` is required.');
  });

  // Test Case 3: Failing to save with quantity less than 1
  test('Should fail to save with a product quantity less than 1', async () => {
    const invalidData = {
      recordedBy: new mongoose.Types.ObjectId(),
      productsReceived: [{
        product: new mongoose.Types.ObjectId(),
        quantity: 0, // Invalid quantity
        costAtTime: 100,
      }],
    };
    const delivery = new Delivery(invalidData);
    
    let err;
    try {
      await delivery.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors['productsReceived.0.quantity']).toBeDefined();
    expect(err.errors['productsReceived.0.quantity'].message).toContain('is less than minimum allowed value (1)');
  });

  // Test Case 4: Failing to save without 'costAtTime'
  test('Should fail to save without a product costAtTime', async () => {
    const invalidData = {
      recordedBy: new mongoose.Types.ObjectId(),
      productsReceived: [{
        product: new mongoose.Types.ObjectId(),
        quantity: 5,
        // costAtTime is missing
      }],
    };
    const delivery = new Delivery(invalidData);
    
    let err;
    try {
      await delivery.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors['productsReceived.0.costAtTime']).toBeDefined();
    expect(err.errors['productsReceived.0.costAtTime'].message).toBe('Path `costAtTime` is required.');
  });
});