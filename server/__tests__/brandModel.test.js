const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Brand = require('../models/brandModel'); // Adjust path if needed

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
  await Brand.deleteMany({});
});

describe('Brand Model Unit Tests', () => {

  // Test Case 1: Saving a valid brand
  test('Should save a brand successfully', async () => {
    const validBrandData = {
      name: 'Test Brand',
    };
    const brand = new Brand(validBrandData);
    const savedBrand = await brand.save();

    // Assertions
    expect(savedBrand._id).toBeDefined();
    expect(savedBrand.name).toBe('Test Brand');
  });

  // Test Case 2: Failing to save without a 'name'
  test('Should fail to save a brand without a name', async () => {
    const invalidData = {}; // No name
    const brand = new Brand(invalidData);
    
    let err;
    try {
      await brand.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.name).toBeDefined();
    expect(err.errors.name.message).toBe('Path `name` is required.');
  });

  // Test Case 3: Failing to save with a duplicate 'name'
  test('Should fail to save with a duplicate name', async () => {
    // Create the first brand
    const brand1 = new Brand({ name: 'Duplicate Brand' });
    await brand1.save();

    // Try to create the second brand with the same name
    const brand2 = new Brand({ name: 'Duplicate Brand' });

    let err;
    try {
      await brand2.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeDefined();
    expect(err.code).toBe(11000); // MongoDB duplicate key error code
  });

  // Test Case 4: Test trim functionality
  test('Should trim whitespace from the name', async () => {
    const brandData = {
      name: '  Trimmed Brand  ',
    };
    const brand = new Brand(brandData);
    const savedBrand = await brand.save();

    // Assertions
    expect(savedBrand.name).toBe('Trimmed Brand');
  });

});