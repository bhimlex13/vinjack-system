const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Motorcycle = require('../models/motorcycleModel'); // Adjust path if needed
// --- ADD: Import Customer if needed for owner field ---
const Customer = require('../models/customerModel'); // Adjust path if needed
// --- END ADD ---

let mongoServer;
// --- ADD: Define testCustomer if using it ---
let testCustomer;
// --- END ADD ---

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  // --- FIX: Add createIndexes ---
  await Motorcycle.createIndexes();
  // --- END FIX ---
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Motorcycle.deleteMany({});
  // --- ADD: Clear and create customer if using it ---
  await Customer.deleteMany({}); // Clear customers too
  testCustomer = await new Customer({ name: 'Test Owner For Moto' }).save(); // Create a fresh owner
  // --- END ADD ---
});

describe('Motorcycle Model Unit Tests', () => {

  // Test Case 1: Saving a valid motorcycle
  test('Should save a motorcycle successfully', async () => {
    const validMotorcycleData = {
      // --- FIX: Use testCustomer._id ---
      owner: testCustomer._id,
      // --- END FIX ---
      make: 'Honda',
      model: 'Click 125i',
      year: 2023,
      plateNumber: 'abc 123',
      vin: 'xyz123',
    };
    const motorcycle = new Motorcycle(validMotorcycleData);
    const savedMotorcycle = await motorcycle.save();

    expect(savedMotorcycle._id).toBeDefined();
    expect(savedMotorcycle.make).toBe('Honda');
    expect(savedMotorcycle.model).toBe('Click 125i');
    expect(savedMotorcycle.plateNumber).toBe('ABC 123');
    expect(savedMotorcycle.vin).toBe('XYZ123');
    // --- FIX: Check against testCustomer._id ---
    expect(savedMotorcycle.owner).toEqual(testCustomer._id);
    // --- END FIX ---
  });

  // Test Case 2: Failing to save without 'owner'
  test('Should fail to save without an owner', async () => {
    const invalidData = { make: 'Yamaha', model: 'NMAX' };
    const motorcycle = new Motorcycle(invalidData);
    let err;
    try { await motorcycle.save(); } catch (error) { err = error; }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.owner).toBeDefined();
  });

  // Test Case 3: Failing to save without 'make'
  test('Should fail to save without a make', async () => {
    const invalidData = {
      // --- FIX: Use testCustomer._id ---
      owner: testCustomer._id,
      // --- END FIX ---
      model: 'Click 125i',
    };
    const motorcycle = new Motorcycle(invalidData);
    let err;
    try { await motorcycle.save(); } catch (error) { err = error; }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.make).toBeDefined();
    expect(err.errors.make.message).toBe('Motorcycle make is required (e.g., Honda, Yamaha).');
  });

  // Test Case 4: Failing to save without 'model'
  test('Should fail to save without a model', async () => {
    const invalidData = {
      // --- FIX: Use testCustomer._id ---
      owner: testCustomer._id,
      // --- END FIX ---
      make: 'Honda',
    };
    const motorcycle = new Motorcycle(invalidData);
    let err;
    try { await motorcycle.save(); } catch (error) { err = error; }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.model).toBeDefined();
    expect(err.errors.model.message).toBe('Motorcycle model is required (e.g., Click 125i, NMAX).');
  });

  // Test Case 5: Failing to save with a duplicate 'plateNumber'
  test('Should fail to save with a duplicate plateNumber', async () => {
    const motorcycle1 = new Motorcycle({
      // --- FIX: Use testCustomer._id ---
      owner: testCustomer._id,
      // --- END FIX ---
      make: 'Honda',
      model: 'Click 125i',
      plateNumber: 'SAMEPLATE 123',
    });
    await motorcycle1.save();

    const motorcycle2 = new Motorcycle({
      // --- FIX: Use testCustomer._id ---
      owner: testCustomer._id,
      // --- END FIX ---
      make: 'Yamaha',
      model: 'NMAX',
      plateNumber: 'sameplate 123', // Test uppercase + unique
    });

    let err;
    try { await motorcycle2.save(); } catch (error) { err = error; }

    expect(err).toBeDefined(); // This should now pass
    expect(err.code).toBe(11000);
  });

  // Test Case 6: Should successfully save two motorcycles with no plateNumber (sparse test)
  test('Should allow saving multiple motorcycles with no plateNumber', async () => {
    const motor1 = new Motorcycle({
      // --- FIX: Use testCustomer._id ---
      owner: testCustomer._id,
      // --- END FIX ---
      make: 'Honda',
      model: 'Wave 110',
    });
    await motor1.save();

    const motor2 = new Motorcycle({
      // --- FIX: Use testCustomer._id ---
      owner: testCustomer._id,
      // --- END FIX ---
      make: 'Suzuki',
      model: 'Raider 150',
    });
    const savedMotor2 = await motor2.save();

    expect(savedMotor2._id).toBeDefined();
    expect(savedMotor2.model).toBe('Raider 150');
  });

  // --- ADD: Test for duplicate VIN if needed ---
  test('Should fail to save with a duplicate vin', async () => {
    const motorcycle1 = new Motorcycle({
      owner: testCustomer._id,
      make: 'Honda',
      model: 'CBR',
      vin: 'VIN12345', // Duplicate
    });
    await motorcycle1.save();

    const motorcycle2 = new Motorcycle({
      owner: testCustomer._id,
      make: 'Suzuki',
      model: 'Gixxer',
      vin: 'VIN12345', // Duplicate
    });

    let err;
    try {
      await motorcycle2.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined(); // Should pass now
    expect(err.code).toBe(11000);
  });
  // --- END ADD ---

});