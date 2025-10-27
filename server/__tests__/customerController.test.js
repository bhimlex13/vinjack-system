// __tests__/customerController.test.js

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} = require('../controllers/customerController'); // Adjust path
const Customer = require('../models/customerModel'); // Adjust path
const Sale = require('../models/saleModel'); // Adjust path
const logAction = require('../utils/logger'); // Import the original logger

// Mock the logger
jest.mock('../utils/logger', () => jest.fn());

let mongoServer;
let mockUser;
let mockSocketIO;
let req;
let res;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  // Add createIndexes to prevent race conditions on the unique 'email' field
  await Customer.createIndexes(); 
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections
  await Customer.deleteMany({});
  await Sale.deleteMany({});

  // Reset all mocks before each test
  jest.clearAllMocks();

  // --- Setup Mock Request & Response ---
  mockUser = { id: new mongoose.Types.ObjectId().toString(), username: 'testuser' };
  mockSocketIO = { emit: jest.fn() };

  req = {
    user: mockUser,
    app: {
      get: jest.fn((key) => {
        if (key === 'socketio') return mockSocketIO;
      }),
    },
    body: {},
    params: {},
  };

  res = {
    status: jest.fn(() => res), // Allows chaining .status().json()
    json: jest.fn(),
  };
  // --- End Mock Setup ---
});

describe('Customer Controller Unit Tests', () => {

  describe('createCustomer', () => {
    
    test('Should create a customer successfully (201)', async () => {
      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123456789',
      };

      await createCustomer(req, res);

      const customer = await Customer.findOne({ name: 'John Doe' });

      // Check database
      expect(customer).toBeDefined();
      expect(customer.email).toBe('john@example.com');
      
      // Check response
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'John Doe' }));
      
      // Check mocks
      expect(logAction).toHaveBeenCalledWith(mockUser, 'CREATE_CUSTOMER', "Created new customer: 'John Doe'", expect.any(Object));
      expect(mockSocketIO.emit).toHaveBeenCalledWith('customer_added', expect.any(Object));
    });

    test('Should create a customer successfully with an empty email string (201)', async () => {
      // This tests the fix in your controller
      req.body = {
        name: 'Jane Doe',
        email: '', // Empty string
        phone: '987654321',
      };

      await createCustomer(req, res);

      const customer = await Customer.findOne({ name: 'Jane Doe' });

      // Check database
      expect(customer).toBeDefined();
      expect(customer.email).toBeUndefined(); // Email should not be set
      
      // Check response
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'Jane Doe' }));
    });

    test('Should fail to create a customer without a name (400)', async () => {
      req.body = {
        email: 'fail@example.com',
      };

      await createCustomer(req, res);

      // Check response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer name is required.' });
    });

    test('Should fail to create a customer with a duplicate email (400)', async () => {
      // Create initial customer
      await new Customer({ name: 'First User', email: 'duplicate@example.com' }).save();

      req.body = {
        name: 'Second User',
        email: 'duplicate@example.com',
      };

      await createCustomer(req, res);

      // Check response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Error creating customer',
      }));
    });
  });

  describe('getAllCustomers', () => {
    
    test('Should return all customers, sorted by name (200)', async () => {
      await new Customer({ name: 'B Customer' }).save();
      await new Customer({ name: 'A Customer' }).save();

      await getAllCustomers(req, res);

      // Check response
      expect(res.json).toHaveBeenCalledWith(expect.any(Array));
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.length).toBe(2);
      expect(responseData[0].name).toBe('A Customer'); // Test the sort
      expect(responseData[1].name).toBe('B Customer');
    });

    test('Should return 500 on server error', async () => {
      // Force an error
      jest.spyOn(Customer, 'find').mockImplementation(() => ({
        sort: jest.fn().mockRejectedValue(new Error('Database error')),
      }));

      await getAllCustomers(req, res);

      // Check response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Server error fetching customers',
      }));
    });
  });
  
  describe('getCustomerById', () => {

    test('Should return a single customer by ID (200)', async () => {
      const customer = await new Customer({ name: 'Find Me' }).save();
      req.params.id = customer._id.toString();

      await getCustomerById(req, res);

      // Check response
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Find Me',
      }));
    });

    test('Should return 404 if customer not found', async () => {
      req.params.id = new mongoose.Types.ObjectId().toString(); // Valid, but non-existent ID

      await getCustomerById(req, res);

      // Check response
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer not found' });
    });
  });

  describe('updateCustomer', () => {
    
    test('Should update a customer successfully (200)', async () => {
      const customer = await new Customer({ name: 'Old Name' }).save();
      req.params.id = customer._id.toString();
      req.body = { name: 'New Name', phone: '111' };

      await updateCustomer(req, res);

      // Check response
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Name',
        phone: '111',
      }));
      
      // Check mock
      expect(logAction).toHaveBeenCalledWith(mockUser, 'UPDATE_CUSTOMER', "Updated customer: 'New Name'", expect.any(Object));
    });

    test('Should set email to null if empty string is passed (200)', async () => {
      // This tests the fix in your controller
      const customer = await new Customer({ name: 'Test User', email: 'test@example.com' }).save();
      req.params.id = customer._id.toString();
      req.body = { email: '' }; // Send empty string

      await updateCustomer(req, res);

      // Check response
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        email: null, // Mongoose setters/validators should convert this to null
      }));
    });

    test('Should return 404 if customer to update is not found', async () => {
      req.params.id = new mongoose.Types.ObjectId().toString();
      req.body = { name: 'New Name' };

      await updateCustomer(req, res);

      // Check response
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer not found' });
    });
  });

  describe('deleteCustomer', () => {

    test('Should delete a customer successfully (200)', async () => {
      const customer = await new Customer({ name: 'To Be Deleted' }).save();
      req.params.id = customer._id.toString();

      await deleteCustomer(req, res);

      const deleted = await Customer.findById(customer._id);
      
      // Check database
      expect(deleted).toBeNull();
      
      // Check response
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer removed successfully.' });
      
      // Check mock
      expect(logAction).toHaveBeenCalledWith(mockUser, 'DELETE_CUSTOMER', "Deleted customer: 'To Be Deleted'", expect.any(Object));
    });

    test('Should return 400 if customer is associated with a sale', async () => {
      const customer = await new Customer({ name: 'Cannot Delete' }).save();
      await new Sale({
        customer: customer._id,
        totalAmount: 100,
        recordedBy: mockUser.id,
        items: [{ 
          product: new mongoose.Types.ObjectId(), 
          quantity: 1, 
          priceAtTime: 100,
          costAtTime: 50 // <-- THIS WAS THE FIX
        }]
      }).save();

      req.params.id = customer._id.toString();

      await deleteCustomer(req, res);

      const notDeleted = await Customer.findById(customer._id);
      
      // Check database
      expect(notDeleted).toBeDefined();

      // Check response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Cannot delete customer. They are associated with existing sales.' });
    });

    test('Should return 404 if customer to delete is not found', async () => {
      req.params.id = new mongoose.Types.ObjectId().toString();

      await deleteCustomer(req, res);

      // Check response
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer not found' });
    });
  });
});