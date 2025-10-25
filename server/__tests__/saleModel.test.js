const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Sale = require('../models/saleModel'); // Adjust path if needed

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
  await Sale.deleteMany({});
});

describe('Sale Model Unit Tests', () => {

  // Test Case 1: Saving a valid sale with items
  test('Should save a sale with items successfully', async () => {
    const validSaleData = {
      recordedBy: new mongoose.Types.ObjectId(), // <-- RENAMED
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          quantity: 2,
          priceAtTime: 150, // <-- RENAMED
          costAtTime: 100,  // <-- RENAMED
        },
      ],
      totalAmount: 300,
      paymentMethod: 'Cash',
    };
    const sale = new Sale(validSaleData);
    const savedSale = await sale.save();

    expect(savedSale._id).toBeDefined();
    expect(savedSale.totalAmount).toBe(300);
    expect(savedSale.items.length).toBe(1);
  });

  // Test Case 2: Saving a valid sale with only services
  test('Should save a sale with services successfully', async () => {
    const validSaleData = {
      recordedBy: new mongoose.Types.ObjectId(),
      services: [
        {
          service: new mongoose.Types.ObjectId(),
          priceAtTime: 500,
        }
      ],
      totalAmount: 500,
      paymentMethod: 'GCash',
    };
    const sale = new Sale(validSaleData);
    const savedSale = await sale.save();

    expect(savedSale._id).toBeDefined();
    expect(savedSale.totalAmount).toBe(500);
    expect(savedSale.services.length).toBe(1);
    expect(savedSale.items.length).toBe(0);
  });

  // Test Case 3: Failing to save without 'recordedBy'
  test('Should fail to save a sale without a recordedBy user', async () => {
    const invalidSaleData = {
      totalAmount: 100,
      items: [{
        product: new mongoose.Types.ObjectId(),
        quantity: 1,
        priceAtTime: 100,
        costAtTime: 50,
      }],
    };
    const sale = new Sale(invalidSaleData);
    
    let err;
    try {
      await sale.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.recordedBy).toBeDefined();
    expect(err.errors.recordedBy.message).toBe('Path `recordedBy` is required.');
  });

  // Test Case 4: Failing to save without 'totalAmount'
  test('Should fail to save a sale without a totalAmount', async () => {
    const invalidSaleData = {
      recordedBy: new mongoose.Types.ObjectId(),
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          quantity: 1,
          priceAtTime: 100,
          costAtTime: 50,
        },
      ],
      paymentMethod: 'Cash',
    };
    const sale = new Sale(invalidSaleData);

    let err;
    try {
      await sale.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.totalAmount).toBeDefined();
    expect(err.errors.totalAmount.message).toBe('Path `totalAmount` is required.');
  });
});