const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Service = require('../models/serviceModel'); // Adjust path if needed

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  // --- FIX: Add createIndexes ---
  await Service.createIndexes();
  // --- END FIX ---
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Service.deleteMany({});
});

describe('Service Model Unit Tests', () => {

  // Test Case 1: Saving a valid service
  test('Should save a service successfully with all required fields', async () => {
    const validServiceData = {
      name: 'Oil Change',
      description: 'Standard oil change service',
      charge: 500,
    };
    const service = new Service(validServiceData);
    const savedService = await service.save();

    expect(savedService._id).toBeDefined();
    expect(savedService.name).toBe('Oil Change');
    expect(savedService.charge).toBe(500);
    expect(savedService.status).toBe('active');
  });

  // Test Case 2: Failing to save without a 'name'
  test('Should fail to save a service without a name', async () => {
    const invalidData = {
      description: 'A service without a name',
      charge: 100,
    };
    const service = new Service(invalidData);
    let err;
    try { await service.save(); } catch (error) { err = error; }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.name).toBeDefined();
    expect(err.errors.name.message).toBe('Please provide a service name');
  });

  // Test Case 3: Failing to save without a 'charge'
  test('Should fail to save a service without a charge', async () => {
    const invalidData = {
      name: 'Service without charge',
      description: 'A service without a charge',
    };
    const service = new Service(invalidData);
    let err;
    try { await service.save(); } catch (error) { err = error; }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.charge).toBeDefined();
    expect(err.errors.charge.message).toBe('Please provide a fixed charge for the service');
  });

  // Test Case 4: Failing to save with a negative 'charge'
  test('Should fail to save with a negative charge', async () => {
    const invalidData = {
      name: 'Service with negative charge',
      charge: -100,
    };
    const service = new Service(invalidData);
    let err;
    try { await service.save(); } catch (error) { err = error; }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.charge).toBeDefined();
    expect(err.errors.charge.message).toContain('Charge cannot be negative');
  });

  // Test Case 5: Duplicate 'name' error
  test('Should fail to save with a duplicate name', async () => {
    const service1 = new Service({
      name: 'Duplicate Service',
      charge: 100,
    });
    await service1.save();

    const service2 = new Service({
      name: 'Duplicate Service',
      charge: 200,
    });

    let err;
    try { await service2.save(); } catch (error) { err = error; }
    expect(err).toBeDefined(); // Should pass now
    expect(err.code).toBe(11000);
  });

});