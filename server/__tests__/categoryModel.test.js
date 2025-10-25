const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Category = require('../models/categoryModel'); // Adjust path if needed

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
  await Category.deleteMany({});
});

describe('Category Model Unit Tests', () => {

  // Test Case 1: Saving a valid category
  test('Should save a category successfully', async () => {
    const validCategoryData = {
      name: 'Engine Parts',
      description: 'Parts related to the engine',
    };
    const category = new Category(validCategoryData);
    const savedCategory = await category.save();

    // Assertions
    expect(savedCategory._id).toBeDefined();
    expect(savedCategory.name).toBe('Engine Parts');
    expect(savedCategory.description).toBe('Parts related to the engine');
  });

  // Test Case 2: Failing to save without a 'name'
  test('Should fail to save a category without a name', async () => {
    const invalidData = {
      description: 'A category without a name',
    };
    const category = new Category(invalidData);
    
    let err;
    try {
      await category.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.name).toBeDefined();
  });

  // Test Case 3: Failing to save with a duplicate 'name'
  test('Should fail to save with a duplicate name', async () => {
    // Create the first category
    const category1 = new Category({
      name: 'Duplicate Category',
    });
    await category1.save();

    // Try to create the second category with the same name
    const category2 = new Category({
      name: 'Duplicate Category',
    });

    let err;
    try {
      await category2.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeDefined();
    expect(err.code).toBe(11000); // MongoDB duplicate key error code
  });

});