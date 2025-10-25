const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const PurchaseOrder = require('../models/purchaseOrderModel'); // Adjust path if needed

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
  await PurchaseOrder.deleteMany({});
});

describe('Purchase Order Model Unit Tests', () => {

  // Test Case 1: Saving a valid Purchase Order
  test('Should save a purchase order successfully', async () => {
    const validPOData = {
      poNumber: 'PO-2025-001',
      supplier: new mongoose.Types.ObjectId(),
      items: [{
        product: new mongoose.Types.ObjectId(),
        quantity: 10,
        cost: 50,
        total: 500,
      }],
      totalAmount: 500,
    };
    const po = new PurchaseOrder(validPOData);
    const savedPO = await po.save();

    // Assertions
    expect(savedPO._id).toBeDefined();
    expect(savedPO.poNumber).toBe('PO-2025-001');
    expect(savedPO.status).toBe('Pending'); // Check default value
    expect(savedPO.items.length).toBe(1);
  });

  // Test Case 2: Failing to save without a 'poNumber'
  test('Should fail to save without a poNumber', async () => {
    const invalidData = {
      supplier: new mongoose.Types.ObjectId(),
      items: [{ product: new mongoose.Types.ObjectId(), quantity: 1, cost: 10, total: 10 }],
      totalAmount: 10,
    };
    const po = new PurchaseOrder(invalidData);
    
    let err;
    try {
      await po.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.poNumber).toBeDefined();
  });

  // Test Case 3: Failing to save without a 'supplier'
  test('Should fail to save without a supplier', async () => {
    const invalidData = {
      poNumber: 'PO-2025-002',
      items: [{ product: new mongoose.Types.ObjectId(), quantity: 1, cost: 10, total: 10 }],
      totalAmount: 10,
    };
    const po = new PurchaseOrder(invalidData);

    let err;
    try {
      await po.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.supplier).toBeDefined();
  });

  // Test Case 4: Failing to save with a negative 'totalAmount'
  test('Should fail to save with a negative totalAmount', async () => {
    const invalidData = {
      poNumber: 'PO-2025-003',
      supplier: new mongoose.Types.ObjectId(),
      items: [{ product: new mongoose.Types.ObjectId(), quantity: 1, cost: 10, total: 10 }],
      totalAmount: -100,
    };
    const po = new PurchaseOrder(invalidData);
    
    let err;
    try {
      await po.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.totalAmount).toBeDefined();
    expect(err.errors.totalAmount.message).toContain('is less than minimum allowed value (0)');
  });

  // Test Case 5: Duplicate 'poNumber' error
  test('Should fail to save with a duplicate poNumber', async () => {
    // Create the first PO
    const po1 = new PurchaseOrder({
      poNumber: 'PO-DUPLICATE-001',
      supplier: new mongoose.Types.ObjectId(),
      items: [{ product: new mongoose.Types.ObjectId(), quantity: 1, cost: 10, total: 10 }],
      totalAmount: 10,
    });
    await po1.save();

    // Try to create the second PO with the same poNumber
    const po2 = new PurchaseOrder({
      poNumber: 'PO-DUPLICATE-001',
      supplier: new mongoose.Types.ObjectId(),
      items: [{ product: new mongoose.Types.ObjectId(), quantity: 5, cost: 2, total: 10 }],
      totalAmount: 10,
    });

    let err;
    try {
      await po2.save();
    } catch (error) {
      err = error;
    }

    // Assertions
    expect(err).toBeDefined();
    expect(err.code).toBe(11000); // MongoDB duplicate key error code
  });
});