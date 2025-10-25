const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Motorcycle = require('../models/motorcycleModel'); // Adjust path if needed

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
  await Motorcycle.deleteMany({});
});

describe('Motorcycle Model Unit Tests', () => {

  // Test Case 1: Saving a valid motorcycle
  test('Should save a motorcycle successfully', async () => {
    const validMotorcycleData = {
      owner: new mongoose.Types.ObjectId(),
      make: 'Honda',
      model: 'Click 125i',
      year: 2023,
      plateNumber: 'abc 123',
      vin: 'xyz123',
    };
    const motorcycle = new Motorcycle(validMotorcycleData);
    const savedMotorcycle = await motorcycle.save();

    // Assertions
    expect(savedMotorcycle._id).toBeDefined();
    expect(savedMotorcycle.make).toBe('Honda');
    expect(savedMotorcycle.model).toBe('Click 125i');
    expect(savedMotorcycle.plateNumber).toBe('ABC 123'); // Check uppercase
    expect(savedMotorcycle.vin).toBe('XYZ123'); // Check uppercase
  });

  // Test Case 2: Failing to save without 'owner'
  test('Should fail to save without an owner', async () => {
    const invalidData = {
      make: 'Yamaha',
      model: 'NMAX',
    };
    const motorcycle = new Motorcycle(invalidData);
    
    let err;
    try {
      await motorcycle.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.owner).toBeDefined();
  });

  // Test Case 3: Failing to save without 'make'
  test('Should fail to save without a make', async () => {
    const invalidData = {
      owner: new mongoose.Types.ObjectId(),
      model: 'Click 125i',
    };
    const motorcycle = new Motorcycle(invalidData);
    
    let err;
    try {
      await motorcycle.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.make).toBeDefined();
    expect(err.errors.make.message).toBe('Motorcycle make is required (e.g., Honda, Yamaha).');
  });

  // Test Case 4: Failing to save without 'model'
  test('Should fail to save without a model', async () => {
    const invalidData = {
      owner: new mongoose.Types.ObjectId(),
      make: 'Honda',
    };
    const motorcycle = new Motorcycle(invalidData);
    
    let err;
    try {
      await motorcycle.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.model).toBeDefined();
    expect(err.errors.model.message).toBe('Motorcycle model is required (e.g., Click 125i, NMAX).');
  });

  // Test Case 5: Failing to save with a duplicate 'plateNumber'
  test('Should fail to save with a duplicate plateNumber', async () => {
    // Create the first motorcycle
    const motorcycle1 = new Motorcycle({
      owner: new mongoose.Types.ObjectId(),
      make: 'Honda',
      model: 'Click 125i',
      plateNumber: 'SAMEPLATE 123',
    });
    await motorcycle1.save();

    // Try to create the second motorcycle with the same plate number
    const motorcycle2 = new Motorcycle({
      owner: new mongoose.Types.ObjectId(),
      make: 'Yamaha',
      model: 'NMAX',
      plateNumber: 'sameplate 123', // Test uppercase + unique
    });

    let err;
    try {
      await motorcycle2.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeDefined();
    expect(err.code).toBe(11000); // MongoDB duplicate key error code
  });

  // Test Case 6: Should successfully save two motorcycles with no plateNumber (sparse test)
  test('Should allow saving multiple motorcycles with no plateNumber', async () => {
    const motor1 = new Motorcycle({
      owner: new mongoose.Types.ObjectId(),
      make: 'Honda',
      model: 'Wave 110',
      // No plate number
    });
    await motor1.save();

    const motor2 = new Motorcycle({
      owner: new mongoose.Types.ObjectId(),
      make: 'Suzuki',
      model: 'Raider 150',
      // No plate number
    });
    const savedMotor2 = await motor2.save(); // This should not throw an error

    // Assertions
    expect(savedMotor2._id).toBeDefined();
    expect(savedMotor2.model).toBe('Raider 150');
  });

});