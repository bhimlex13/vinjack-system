const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Customer = require('../models/customerModel'); // Adjust path if needed

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // ADDED THIS LINE:
  // This forces Mongoose to wait until the 'unique' index is built
  await Customer.createIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Customer.deleteMany({});
});

describe('Customer Model Unit Tests', () => {

  // Test Case 1: Saving a valid customer
  test('Should save a customer successfully', async () => {
    const validCustomerData = {
      name: 'John Doe',
      phone: '09123456789', // <-- RENAMED
      email: 'john@example.com',
      address: '123 Main St',
    };
    const customer = new Customer(validCustomerData);
    const savedCustomer = await customer.save();

    // Assertions
    expect(savedCustomer._id).toBeDefined();
    expect(savedCustomer.name).toBe('John Doe');
    expect(savedCustomer.phone).toBe('09123456789'); // <-- RENAMED
  });

  // Test Case 2: Failing to save without a 'name'
  test('Should fail to save a customer without a name', async () => {
    const invalidData = {
      phone: '09987654321',
    };
    const customer = new Customer(invalidData);
    
    let err;
    try {
      await customer.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.name).toBeDefined();
    expect(err.errors.name.message).toContain('is required');
  });

  // Test Case 3: Failing to save with an invalid 'email'
  test('Should fail to save with an invalid email format', async () => {
    const invalidData = {
      name: 'Jane Doe',
      phone: '09111111111',
      email: 'not-a-valid-email', // <-- INVALID
    };
    const customer = new Customer(invalidData);
    
    let err;
    try {
      await customer.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.email).toBeDefined();
    expect(err.errors.email.message).toContain('Please fill a valid email address');
  });

  // Test Case 4: Failing to save with a duplicate 'email'
  test('Should fail to save with a duplicate email', async () => {
    // Create the first customer
    const customer1 = new Customer({
      name: 'Customer One',
      phone: '09000000001',
      email: 'duplicate@example.com', // <-- DUPLICATE
    });
    await customer1.save();

    // Try to create the second customer with the same email
    const customer2 = new Customer({
      name: 'Customer Two',
      phone: '09000000002',
      email: 'duplicate@example.com', // <-- DUPLICATE
    });

    let err;
    try {
      await customer2.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeDefined();
    expect(err.code).toBe(11000); // MongoDB duplicate key error code
  });

  // Test Case 5: Should allow saving with no email (sparse test)
  test('Should save a customer successfully without an email', async () => {
    const validCustomerData = {
      name: 'No Email User',
      phone: '09222222222',
    };
    const customer = new Customer(validCustomerData);
    const savedCustomer = await customer.save();

    // Assertions
    expect(savedCustomer._id).toBeDefined();
    expect(savedCustomer.name).toBe('No Email User');
    expect(savedCustomer.email).toBeUndefined();
  });

});