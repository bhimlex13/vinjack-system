// __tests__/supplierController.test.js

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
  createSupplier,
  getSuppliers,
  updateSupplier,
  deleteSupplier,
} = require('../controllers/supplierController'); // Adjust path
const Supplier = require('../models/supplierModel'); // Adjust path
const logAction = require('../utils/logger'); // Import the original logger

// Mock the logger
jest.mock('../utils/logger', () => jest.fn());

let mongoServer;
let mockUser;
let req;
let res;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  // Add createIndexes for the unique 'name' field
  await Supplier.createIndexes(); 
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear collections
  await Supplier.deleteMany({});

  // Reset all mocks
  jest.clearAllMocks();

  // --- Setup Mock Request & Response ---
  mockUser = { id: new mongoose.Types.ObjectId().toString(), username: 'testuser' };

  req = {
    user: mockUser,
    body: {},
    params: {},
  };

  res = {
    status: jest.fn(() => res),
    json: jest.fn(),
  };
  // --- End Mock Setup ---
});

describe('Supplier Controller Unit Tests', () => {

  describe('createSupplier', () => {
    
    test('Should create a supplier successfully (201)', async () => {
      req.body = {
        name: 'Honda Parts Supply',
        email: 'contact@honda.com',
        contactPerson: 'John Honda',
      };

      await createSupplier(req, res);

      const supplier = await Supplier.findOne({ name: 'Honda Parts Supply' });

      // Check database
      expect(supplier).toBeDefined();
      expect(supplier.email).toBe('contact@honda.com');
      
      // Check response
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'Honda Parts Supply' }));
      
      // Check mocks
      expect(logAction).toHaveBeenCalledWith(mockUser, 'CREATE_SUPPLIER', "Created new supplier: 'Honda Parts Supply'");
    });

    test('Should fail to create a supplier without a name (400)', async () => {
      req.body = {
        email: 'fail@example.com',
      };

      await createSupplier(req, res);

      // Check response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error creating supplier' }));
    });

    test('Should fail to create a supplier with a duplicate name (400)', async () => {
      // Create initial supplier
      await new Supplier({ name: 'Duplicate Name' }).save();

      req.body = {
        name: 'Duplicate Name',
      };

      await createSupplier(req, res);

      // Check response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Supplier name already exists.' });
    });
  });

  describe('getSuppliers', () => {
    
    test('Should return all suppliers (200)', async () => {
      await new Supplier({ name: 'Supplier A' }).save();
      await new Supplier({ name: 'Supplier B' }).save();

      await getSuppliers(req, res);

      // Check response
      expect(res.json).toHaveBeenCalledWith(expect.any(Array));
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.length).toBe(2);
    });

    test('Should return 500 on server error', async () => {
      // Force an error
      jest.spyOn(Supplier, 'find').mockRejectedValue(new Error('Database error'));

      await getSuppliers(req, res);

      // Check response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server Error' });
    });
  });
  
  describe('updateSupplier', () => {

    test('Should update a supplier successfully (200)', async () => {
      const supplier = await new Supplier({ name: 'Old Name' }).save();
      req.params.id = supplier._id.toString();
      req.body = { name: 'New Name', contactPerson: 'Jane Doe' };

      await updateSupplier(req, res);

      // Check response
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Name',
        contactPerson: 'Jane Doe',
      }));
      
      // Check mock
      expect(logAction).toHaveBeenCalledWith(mockUser, 'UPDATE_SUPPLIER', "Updated supplier: 'New Name'");
    });

    test('Should return 404 if supplier to update is not found', async () => {
      req.params.id = new mongoose.Types.ObjectId().toString();
      req.body = { name: 'New Name' };

      await updateSupplier(req, res);

      // Check response
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Supplier not found' });
    });

    test('Should return 400 for duplicate name on update', async () => {
      await new Supplier({ name: 'Existing Name' }).save();
      const supplierToUpdate = await new Supplier({ name: 'Original Name' }).save();
      
      req.params.id = supplierToUpdate._id.toString();
      req.body = { name: 'Existing Name' }; // Try to update to a duplicate name

      await updateSupplier(req, res);

      // Check response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Supplier name already exists.' });
    });
  });

  describe('deleteSupplier', () => {

    test('Should delete a supplier successfully (200)', async () => {
      const supplier = await new Supplier({ name: 'To Be Deleted' }).save();
      req.params.id = supplier._id.toString();

      await deleteSupplier(req, res);

      const deleted = await Supplier.findById(supplier._id);
      
      // Check database
      expect(deleted).toBeNull();
      
      // Check response
      expect(res.json).toHaveBeenCalledWith({ message: 'Supplier removed' });
      
      // Check mock
      expect(logAction).toHaveBeenCalledWith(mockUser, 'DELETE_SUPPLIER', "Deleted supplier: 'To Be Deleted'");
    });

    
    test('Should return 404 if supplier to delete is not found', async () => {
      req.params.id = new mongoose.Types.ObjectId().toString();

      await deleteSupplier(req, res);

      // Check response
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Supplier not found' });
    });
    
    // NOTE: Your current `deleteSupplier` controller logic does *not* check
    // if a supplier is in use (e.g., in a Delivery or Product). 
    // If you add that feature later, you will need to add a test for it.
  });
});