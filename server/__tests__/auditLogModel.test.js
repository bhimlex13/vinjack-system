const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const AuditLog = require('../models/auditLogModel'); // Adjust path if needed

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
  await AuditLog.deleteMany({});
});

describe('AuditLog Model Unit Tests', () => {

  // Test Case 1: Saving a valid log
  test('Should save an audit log successfully', async () => {
    const validLogData = {
      user: new mongoose.Types.ObjectId(),
      action: 'CREATE_PRODUCT', // Use a valid enum value
      details: 'Created new product "Test Product"',
      entityType: 'Product',
      entityId: new mongoose.Types.ObjectId(),
    };
    const log = new AuditLog(validLogData);
    const savedLog = await log.save();

    // Assertions
    expect(savedLog._id).toBeDefined();
    expect(savedLog.action).toBe('CREATE_PRODUCT');
    expect(savedLog.entityType).toBe('Product');
  });

  // Test Case 2: Failing to save without 'user'
  test('Should fail to save a log without a user', async () => {
    const invalidData = {
      action: 'UPDATE_PRODUCT',
      details: 'Test action',
    };
    const log = new AuditLog(invalidData);
    
    let err;
    try {
      await log.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.user).toBeDefined();
  });

  // Test Case 3: Failing to save without 'action'
  test('Should fail to save a log without an action', async () => {
    const invalidData = {
      user: new mongoose.Types.ObjectId(),
      details: 'Test action',
    };
    const log = new AuditLog(invalidData);
    
    let err;
    try {
      await log.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.action).toBeDefined();
  });

  // Test Case 4: Failing to save without 'details'
  test('Should fail to save a log without details', async () => {
    const invalidData = {
      user: new mongoose.Types.ObjectId(),
      action: 'LOGIN',
    };
    const log = new AuditLog(invalidData);
    
    let err;
    try {
      await log.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.details).toBeDefined();
  });

  // Test Case 5: Failing to save with an invalid 'action' enum
  test('Should fail to save with an invalid action enum', async () => {
    const invalidData = {
      user: new mongoose.Types.ObjectId(),
      action: 'INVALID_ACTION_ENUM', // This is not in your enum list
      details: 'Test invalid action',
    };
    const log = new AuditLog(invalidData);
    
    let err;
    try {
      await log.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.action).toBeDefined();
    expect(err.errors.action.message).toContain('is not a valid enum value');
  });
});