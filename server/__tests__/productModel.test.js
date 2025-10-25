const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Product = require('../models/productModel'); // Adjust path if needed

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
  // Clear the Product collection before each test
  await Product.deleteMany({});
});

describe('Product Model Unit Tests', () => {

  // Test Case 1: Saving a valid product
  test('Should save a product successfully with all required fields', async () => {
    const validProductData = {
      itemCode: 'TEST001', // <-- ADDED
      name: 'Test Product',
      description: 'A product for testing',
      category: new mongoose.Types.ObjectId(), // Creates a mock ID
      brand: new mongoose.Types.ObjectId(),    // Creates a mock ID
      supplier: new mongoose.Types.ObjectId(), // Creates a mock ID
      cost: 100,         // <-- RENAMED
      price: 150,        // <-- RENAMED
      quantity: 10,
      reorderLevel: 5,
    };
    const product = new Product(validProductData);
    const savedProduct = await product.save();

    // Assertions
    expect(savedProduct._id).toBeDefined();
    expect(savedProduct.name).toBe('Test Product');
    expect(savedProduct.itemCode).toBe('TEST001');
    expect(savedProduct.quantity).toBe(10);
    expect(savedProduct.cost).toBe(100);
  });

  // Test Case 2: Failing to save without a 'name'
  test('Should fail to save a product without a name', async () => {
    const invalidProductData = {
      itemCode: 'TEST002', // <-- ADDED
      cost: 100,         // <-- RENAMED
      price: 150,        // <-- RENAMED
      quantity: 10,
      category: new mongoose.Types.ObjectId(), // <-- ADDED
      brand: new mongoose.Types.ObjectId(),    // <-- ADDED
    };
    const product = new Product(invalidProductData);

    let err;
    try {
      await product.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.name).toBeDefined();
    expect(err.errors.name.message).toBe('Path `name` is required.');
  });

  // Test Case 3: Applying default quantity of 0
  test('Should apply default quantity of 0 if quantity is not provided', async () => {
    const productData = {
      itemCode: 'TEST003', // <-- ADDED
      name: 'Test Product 2',
      cost: 50,         // <-- RENAMED
      price: 75,        // <-- RENAMED
      category: new mongoose.Types.ObjectId(), // <-- ADDED
      brand: new mongoose.Types.ObjectId(),    // <-- ADDED
    };
    const product = new Product(productData);
    const savedProduct = await product.save();

    // Assertions
    expect(savedProduct.quantity).toBe(0);
  });

  // Test Case 4: Failing to save with a negative 'quantity'
  test('Should fail to save a product with a negative quantity', async () => {
    const invalidProductData = {
      itemCode: 'TEST004', // <-- ADDED
      name: 'Test Product 3',
      cost: 100,         // <-- RENAMED
      price: 150,        // <-- RENAMED
      quantity: -5,
      category: new mongoose.Types.ObjectId(), // <-- ADDED
      brand: new mongoose.Types.ObjectId(),    // <-- ADDED
    };
    const product = new Product(invalidProductData);

    let err;
    try {
      await product.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.quantity).toBeDefined();
    // FIX THE ASSERTION MESSAGE:
    expect(err.errors.quantity.message).toContain('is less than minimum allowed value (0)');
  });

  // Test Case 5: Failing to save with a negative 'cost'
  test('Should fail to save a product with a negative cost', async () => {
    const invalidProductData = {
      itemCode: 'TEST005', // <-- ADDED
      name: 'Test Product 4',
      cost: -100,        // <-- RENAMED
      price: 150,        // <-- RENAMED
      quantity: 10,
      category: new mongoose.Types.ObjectId(), // <-- ADDED
      brand: new mongoose.Types.ObjectId(),    // <-- ADDED
    };
    const product = new Product(invalidProductData);

    let err;
    try {
      await product.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.cost).toBeDefined(); // <-- RENAMED
    // FIX THE ASSERTION MESSAGE:
    expect(err.errors.cost.message).toContain('is less than minimum allowed value (0)');
  });

});