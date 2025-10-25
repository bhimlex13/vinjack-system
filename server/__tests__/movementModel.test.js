const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Movement = require('../models/movementModel'); // Adjust path if needed

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
  await Movement.deleteMany({});
});

describe('Movement Model Unit Tests', () => {

  // Test Case 1: Saving a valid movement
  test('Should save a movement successfully', async () => {
    const validMovementData = {
      product: new mongoose.Types.ObjectId(),
      type: 'SALE',
      quantityChange: -2,
      stockBefore: 10,
      stockAfter: 8,
      referenceId: new mongoose.Types.ObjectId().toString(),
      recordedBy: new mongoose.Types.ObjectId(),
    };
    const movement = new Movement(validMovementData);
    const savedMovement = await movement.save();

    // Assertions
    expect(savedMovement._id).toBeDefined();
    expect(savedMovement.type).toBe('SALE');
    expect(savedMovement.quantityChange).toBe(-2);
    expect(savedMovement.stockAfter).toBe(8);
  });

  // Test Case 2: Failing to save without 'product'
  test('Should fail to save without a product', async () => {
    const invalidData = {
      type: 'DELIVERY',
      quantityChange: 50,
      stockBefore: 0,
      stockAfter: 50,
      recordedBy: new mongoose.Types.ObjectId(),
    };
    const movement = new Movement(invalidData);
    
    let err;
    try {
      await movement.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.product).toBeDefined();
  });

  // Test Case 3: Failing to save without 'type'
  test('Should fail to save without a type', async () => {
    const invalidData = {
      product: new mongoose.Types.ObjectId(),
      quantityChange: -1,
      stockBefore: 10,
      stockAfter: 9,
      recordedBy: new mongoose.Types.ObjectId(),
    };
    const movement = new Movement(invalidData);
    
    let err;
    try {
      await movement.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.type).toBeDefined();
  });

  // Test Case 4: Failing to save with an invalid 'type' enum
  test('Should fail to save with an invalid type enum', async () => {
    const invalidData = {
      product: new mongoose.Types.ObjectId(),
      type: 'INVALID_TYPE', // This is not in your enum list
      quantityChange: 5,
      stockBefore: 10,
      stockAfter: 15,
      recordedBy: new mongoose.Types.ObjectId(),
    };
    const movement = new Movement(invalidData);
    
    let err;
    try {
      await movement.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.type).toBeDefined();
    expect(err.errors.type.message).toContain('is not a valid enum value');
  });

  // Test Case 5: Failing to save without 'quantityChange'
  test('Should fail to save without quantityChange', async () => {
    const invalidData = {
      product: new mongoose.Types.ObjectId(),
      type: 'ADJUSTMENT',
      stockBefore: 10,
      stockAfter: 10,
      recordedBy: new mongoose.Types.ObjectId(),
    };
    const movement = new Movement(invalidData);
    
    let err;
    try {
      await movement.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.quantityChange).toBeDefined();
  });

  // Test Case 6: Failing to save without 'recordedBy'
  test('Should fail to save without recordedBy', async () => {
    const invalidData = {
      product: new mongoose.Types.ObjectId(),
      type: 'RETURN',
      quantityChange: 1,
      stockBefore: 9,
      stockAfter: 10,
    };
    const movement = new Movement(invalidData);
    
    let err;
    try {
      await movement.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.recordedBy).toBeDefined();
  });
});