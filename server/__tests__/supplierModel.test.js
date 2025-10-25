const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Supplier = require('../models/supplierModel'); // Adjust path if needed

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
  await Supplier.deleteMany({});
});

describe('Supplier Model Unit Tests', () => {

  // Test Case 1: Saving a valid supplier
  test('Should save a supplier successfully with all required fields', async () => {
    const validSupplierData = {
      name: 'Test Supplier',
      contactPerson: 'John Doe',
      contactNumber: '09123456789',
      email: 'supplier@test.com',
      address: '123 Test St, Test City',
    };
    const supplier = new Supplier(validSupplierData);
    const savedSupplier = await supplier.save();

    // Assertions
    expect(savedSupplier._id).toBeDefined();
    expect(savedSupplier.name).toBe('Test Supplier');
    expect(savedSupplier.contactPerson).toBe('John Doe');
  });

  // Test Case 2: Failing to save without a 'name'
  test('Should fail to save a supplier without a name', async () => {
    const invalidData = {
      contactPerson: 'John Doe',
      contactNumber: '09123456789',
    };
    const supplier = new Supplier(invalidData);
    
    let err;
    try {
      await supplier.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.name).toBeDefined();
  });

  // Test Case 3: Failing to save with a duplicate 'name'
  test('Should fail to save with a duplicate name', async () => {
    // Create the first supplier
    const supplier1 = new Supplier({
      name: 'Duplicate Supplier',
      contactNumber: '09111111111',
    });
    await supplier1.save();

    // Try to create the second supplier with the same name
    const supplier2 = new Supplier({
      name: 'Duplicate Supplier',
      contactNumber: '09222222222',
    });

    let err;
    try {
      await supplier2.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeDefined();
    expect(err.code).toBe(11000); // MongoDB duplicate key error code
  });

});