const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Notification = require('../models/notificationModel'); // Adjust path if needed

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
  await Notification.deleteMany({});
});

describe('Notification Model Unit Tests', () => {

  // Test Case 1: Saving a valid notification
  test('Should save a notification successfully', async () => {
    const validNotificationData = {
      user: new mongoose.Types.ObjectId(),
      message: 'Product "Test Oil" is low on stock.',
      type: 'LOW_STOCK',
      link: '/inventory/product/12345',
    };
    const notification = new Notification(validNotificationData);
    const savedNotification = await notification.save();

    // Assertions
    expect(savedNotification._id).toBeDefined();
    expect(savedNotification.message).toBe('Product "Test Oil" is low on stock.');
    expect(savedNotification.type).toBe('LOW_STOCK');
    expect(savedNotification.isRead).toBe(false); // Check default value
    expect(savedNotification.image).toBe(''); // Check default value
  });

  // Test Case 2: Failing to save without 'user'
  test('Should fail to save without a user', async () => {
    const invalidData = {
      message: 'Test message',
      type: 'USER_ACTION',
    };
    const notification = new Notification(invalidData);
    
    let err;
    try {
      await notification.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.user).toBeDefined();
  });

  // Test Case 3: Failing to save without 'message'
  test('Should fail to save without a message', async () => {
    const invalidData = {
      user: new mongoose.Types.ObjectId(),
      type: 'USER_ACTION',
    };
    const notification = new Notification(invalidData);
    
    let err;
    try {
      await notification.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.message).toBeDefined();
  });

  // Test Case 4: Failing to save without 'type'
  test('Should fail to save without a type', async () => {
    const invalidData = {
      user: new mongoose.Types.ObjectId(),
      message: 'Test message',
    };
    const notification = new Notification(invalidData);
    
    let err;
    try {
      await notification.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.type).toBeDefined();
  });

  // Test Case 5: Failing to save with an invalid 'type' enum
  test('Should fail to save with an invalid type enum', async () => {
    const invalidData = {
      user: new mongoose.Types.ObjectId(),
      message: 'Test message',
      type: 'INVALID_TYPE', // This is not in your enum list
    };
    const notification = new Notification(invalidData);
    
    let err;
    try {
      await notification.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.type).toBeDefined();
    expect(err.errors.type.message).toContain('is not a valid enum value');
  });

});