const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Setting = require('../models/settingModel'); // Adjust path if needed

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  // ADDED THIS LINE:
  // This forces Mongoose to wait until the 'unique' index is built
  await Setting.createIndexes(); 
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Setting.deleteMany({});
});

describe('Setting Model Unit Tests', () => {

  // Test Case 1: Saving a valid setting
  test('Should save a setting successfully', async () => {
    const validSettingData = {
      key: 'shopName',
      value: 'VinJack Motorworks',
    };
    const setting = new Setting(validSettingData);
    const savedSetting = await setting.save();

    // Assertions
    expect(savedSetting._id).toBeDefined();
    expect(savedSetting.key).toBe('shopName');
    expect(savedSetting.value).toBe('VinJack Motorworks');
  });

  // Test Case 2: Failing to save without a 'key'
  test('Should fail to save a setting without a key', async () => {
    const invalidData = {
      value: 'Some Value',
    };
    const setting = new Setting(invalidData);
    
    let err;
    try {
      await setting.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.key).toBeDefined();
    expect(err.errors.key.message).toContain('is required');
  });

  // Test Case 3: Failing to save without a 'value'
  test('Should fail to save a setting without a value', async () => {
    const invalidData = {
      key: 'shopAddress',
    };
    const setting = new Setting(invalidData);
    
    let err;
    try {
      await setting.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.value).toBeDefined();
    expect(err.errors.value.message).toContain('is required');
  });

  // Test Case 4: Failing to save with a duplicate 'key'
  test('Should fail to save with a duplicate key', async () => {
    // Create the first setting
    const setting1 = new Setting({ key: 'shopName', value: 'Original Name' });
    await setting1.save();

    // Try to create the second setting with the same key
    const setting2 = new Setting({ key: 'shopName', value: 'New Name' });

    let err;
    try {
      await setting2.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeDefined();
    expect(err.code).toBe(11000); // MongoDB duplicate key error code
  });

  // Test Case 5: Test trim functionality
  test('Should trim whitespace from key and value', async () => {
    const settingData = {
      key: '  trimmedKey  ',
      value: '  trimmedValue  ',
    };
    const setting = new Setting(settingData);
    const savedSetting = await setting.save();

    // Assertions
    expect(savedSetting.key).toBe('trimmedKey');
    expect(savedSetting.value).toBe('trimmedValue');
  });

});