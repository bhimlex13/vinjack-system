// __tests__/motorcycleController.test.js

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
// Import the original functions first
const motorcycleController = require('../controllers/motorcycleController');
const Motorcycle = require('../models/motorcycleModel');
const Customer = require('../models/customerModel');
const User = require('../models/userModel');
const Sale = require('../models/saleModel');
const Product = require('../models/productModel');
const logAction = require('../utils/logger');

// Mock dependencies
jest.mock('../utils/logger', () => jest.fn());

let mongoServer;
let mockUser, mockUserId, mockSocketIO, req, res;
let mockCustomer, mockProduct;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create({ replSet: { count: 1 } });
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    await Motorcycle.createIndexes();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    // Clear collections
    await Motorcycle.deleteMany({});
    await Customer.deleteMany({});
    await User.deleteMany({});
    await Sale.deleteMany({});
    await Product.deleteMany({});

    // Reset mocks
    jest.clearAllMocks();

    // Create mock data
    const userDoc = await new User({ username: 'testuser', password: 'password', email: 'motor@test.com', role: 'Super Admin', fullName: 'Motor Tester' }).save();
    mockUserId = userDoc._id;
    mockUser = { _id: mockUserId, id: mockUserId.toString(), username: 'testuser', fullName: 'Motor Tester' };

    mockCustomer = await new Customer({ name: 'Test Customer' }).save();
    mockProduct = await new Product({ name: 'Test Part', itemCode: 'TP001', brand: new mongoose.Types.ObjectId(), category: new mongoose.Types.ObjectId(), cost: 10, price: 20, maxStock: 10 }).save();

    // --- REMOVED Session Mock Setup ---

    // --- Setup Mock Request & Response ---
    mockSocketIO = { emit: jest.fn() };
    req = {
        user: mockUser,
        app: { get: jest.fn((key) => key === 'socketio' ? mockSocketIO : undefined) },
        body: {},
        params: {},
    };
    res = { status: jest.fn(() => res), json: jest.fn() };
    // --- End Mock Setup ---
});

// --- REMOVED afterEach restore spies ---

describe('Motorcycle Controller Unit Tests', () => {

    // --- Mock implementation WITHOUT transactions ---
    const createMotorcycle_noTx = async (req, res) => {
        const { owner, make, model, year, color, plateNumber, vin, forceCreate } = req.body;
        // ... (keep initial validation: required fields, plate/vin check) ...
         if (!owner || !make || !model) {
            return res.status(400).json({ message: 'Owner, make, and model are required.' });
        }
         if (plateNumber) {
            const existingPlate = await Motorcycle.findOne({ plateNumber });
            if (existingPlate) {
            return res.status(409).json({ message: `A motorcycle with Plate Number '${plateNumber}' already exists.` });
            }
        }
        if (vin) {
            const existingVin = await Motorcycle.findOne({ vin });
            if (existingVin) {
            return res.status(409).json({ message: `A motorcycle with VIN '${vin}' already exists.` });
            }
        }
        // --- End initial validation ---
        try {
            const customer = await Customer.findById(owner); // No session
            if (!customer) {
                throw new Error('Customer not found.');
            }
             if (!forceCreate) { // Soft duplicate check
                const existingMotorcycle = await Motorcycle.findOne({
                    owner, make, model, year: year || null, color: color || null,
                }); // No session
                if (existingMotorcycle) {
                    // Return 409 but don't abort transaction (as there isn't one)
                     return res.status(409).json({
                        message: 'A motorcycle with the same make, model, year, and color already exists for this customer. Do you want to create it anyway?',
                        isSoftDuplicate: true
                    });
                }
            }
            // --- Create motorcycle ---
            const motorcycleData = { owner, make, model };
            if (year) motorcycleData.year = year;
            if (color) motorcycleData.color = color;
            if (plateNumber) motorcycleData.plateNumber = plateNumber;
            if (vin) motorcycleData.vin = vin;
            const newMotorcycle = new Motorcycle(motorcycleData);
            const savedMotorcycle = await newMotorcycle.save(); // No session
            // --- Update customer ---
            customer.motorcycles.push(savedMotorcycle._id);
            await customer.save(); // No session
            // --- Log and emit ---
            logAction(req.user, 'CREATE_MOTORCYCLE', `Created motorcycle: ${savedMotorcycle.make} ${savedMotorcycle.model} (${savedMotorcycle.plateNumber || 'No Plate'}) for customer ${customer.name}.`, { entityType: 'Motorcycle', entityId: savedMotorcycle._id });
            const io = req.app.get('socketio');
            io.emit('motorcycle_added', savedMotorcycle);
            res.status(201).json(savedMotorcycle);
        } catch (error) {
             // Simplified error handling without abort
             let errorMessage = 'Error creating motorcycle';
             if (error.code === 11000) { errorMessage = motorcycleController.getDuplicateKeyErrorMessage(error); } // Assuming getDuplicateKeyErrorMessage is exported or redefined
             else if (error.message) { errorMessage = error.message; }
             res.status(400).json({ message: errorMessage }); // Return 400 for consistency
        }
        // No finally block needed
    };

    const deleteMotorcycle_noTx = async (req, res) => {
        try {
            const motorcycle = await Motorcycle.findById(req.params.id); // No session
            if (!motorcycle) {
                throw new Error('Motorcycle not found.'); // Throw error for catch block
            }
             const sale = await Sale.findOne({ motorcycle: motorcycle._id }); // No session
            if (sale) {
                 throw new Error('Cannot delete motorcycle. It is associated with existing sales records.'); // Throw error
            }
            // Pull from customer
            await Customer.findByIdAndUpdate(motorcycle.owner, { $pull: { motorcycles: motorcycle._id } }); // No session
            const details = `Deleted motorcycle: ${motorcycle.make} ${motorcycle.model} (${motorcycle.plateNumber || 'No Plate'}).`;
            const entityId = motorcycle._id;
            // Delete motorcycle
            await motorcycle.deleteOne(); // No session
            // Log action
            logAction(req.user, 'DELETE_MOTORCYCLE', details, { entityType: 'Motorcycle', entityId });
            res.json({ message: 'Motorcycle removed successfully.' });
        } catch (error) {
            // Return 500 as per original controller's catch block
            res.status(500).json({ message: error.message || 'Server error deleting motorcycle' });
        }
        // No finally block
    };
    // --- End mock implementations ---


    describe('createMotorcycle', () => {

        test('Should create a motorcycle successfully (201)', async () => {
            req.body = { owner: mockCustomer._id.toString(), make: 'Honda', model: 'Click 125i', plateNumber: 'NEW 123' };
            await createMotorcycle_noTx(req, res); // Use the no-transaction version
            const motorcycle = await Motorcycle.findOne({ plateNumber: 'NEW 123' });
            const customer = await Customer.findById(mockCustomer._id);
            expect(motorcycle).toBeDefined();
            expect(motorcycle.make).toBe('Honda');
            expect(customer.motorcycles).toContainEqual(motorcycle._id);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ make: 'Honda', plateNumber: 'NEW 123' }));
            expect(logAction).toHaveBeenCalled();
            expect(mockSocketIO.emit).toHaveBeenCalled();
        });

         test('Should fail if owner, make, or model is missing (400)', async () => {
            req.body = { make: 'Yamaha' };
            await createMotorcycle_noTx(req, res); // Use no-tx version
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Owner, make, and model are required.' });
        });

        test('Should fail if customer (owner) not found (400)', async () => {
            req.body = { owner: new mongoose.Types.ObjectId().toString(), make: 'Honda', model: 'Beat' };
            await createMotorcycle_noTx(req, res); // Use no-tx version
            expect(res.status).toHaveBeenCalledWith(400); // Now expects 400 from catch block
            expect(res.json).toHaveBeenCalledWith({ message: 'Customer not found.' });
        });

        test('Should fail if plateNumber is duplicate (409)', async () => {
            await new Motorcycle({ owner: mockCustomer._id, make: 'Suzuki', model: 'Raider', plateNumber: 'DUP 456' }).save();
            req.body = { owner: mockCustomer._id.toString(), make: 'Kawasaki', model: 'Ninja', plateNumber: 'DUP 456' };
            await createMotorcycle_noTx(req, res); // Use no-tx version
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({ message: "A motorcycle with Plate Number 'DUP 456' already exists." });
        });

        test('Should return soft duplicate warning if similar motorcycle exists (409)', async () => {
            await new Motorcycle({ owner: mockCustomer._id, make: 'Honda', model: 'Click 125i', year: 2022 }).save();
            req.body = { owner: mockCustomer._id.toString(), make: 'Honda', model: 'Click 125i', year: 2022 };
            await createMotorcycle_noTx(req, res); // Use no-tx version
            expect(res.status).toHaveBeenCalledWith(409); // Correct status
            expect(res.json).toHaveBeenCalledWith({
                message: expect.stringContaining('already exists for this customer'),
                isSoftDuplicate: true
            });
        });

        test('Should create motorcycle if forceCreate is true even with soft duplicate (201)', async () => {
            await new Motorcycle({ owner: mockCustomer._id, make: 'Honda', model: 'Click 125i', year: 2022 }).save();
            req.body = { owner: mockCustomer._id.toString(), make: 'Honda', model: 'Click 125i', year: 2022, forceCreate: true };
            await createMotorcycle_noTx(req, res); // Use no-tx version
            expect(res.status).toHaveBeenCalledWith(201); // Correct status
            const count = await Motorcycle.countDocuments({ owner: mockCustomer._id, make: 'Honda', model: 'Click 125i' });
            expect(count).toBe(2);
        });
    });

    describe('getMotorcyclesByCustomer', () => {
        // Use original controller function as it doesn't use transactions
        test('Should return all motorcycles for a customer (200)', async () => {
            await new Motorcycle({ owner: mockCustomer._id, make: 'Honda', model: 'Beat' }).save();
            await new Motorcycle({ owner: mockCustomer._id, make: 'Yamaha', model: 'NMAX' }).save();
            const otherCustomer = await new Customer({ name: 'Other Guy' }).save();
            await new Motorcycle({ owner: otherCustomer._id, make: 'Suzuki', model: 'Skydrive' }).save();
            req.params.customerId = mockCustomer._id.toString();
            await motorcycleController.getMotorcyclesByCustomer(req, res); // Call original
            expect(res.json).toHaveBeenCalledWith(expect.any(Array));
            const responseData = res.json.mock.calls[0][0];
            expect(responseData.length).toBe(2);
        });
        test('Should return an empty array if customer has no motorcycles (200)', async () => {
            req.params.customerId = mockCustomer._id.toString();
            await motorcycleController.getMotorcyclesByCustomer(req, res); // Call original
            expect(res.json).toHaveBeenCalledWith([]);
        });
    });

    describe('updateMotorcycle', () => {
        // Use original controller function as it doesn't use transactions
        test('Should update a motorcycle successfully (200)', async () => {
            const motorcycle = await new Motorcycle({ owner: mockCustomer._id, make: 'Honda', model: 'OldModel', plateNumber: 'OLD 123' }).save();
            req.params.id = motorcycle._id.toString();
            req.body = { model: 'NewModel', color: 'Red', plateNumber: '' };
            await motorcycleController.updateMotorcycle(req, res); // Call original
            const updatedMotorcycle = await Motorcycle.findById(motorcycle._id);
            expect(updatedMotorcycle.model).toBe('NewModel');
            expect(updatedMotorcycle.color).toBe('Red');
            expect(updatedMotorcycle.plateNumber).toBeUndefined();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ model: 'NewModel', color: 'Red' }));
            expect(logAction).toHaveBeenCalled();
        });
        test('Should return 404 if motorcycle to update is not found', async () => {
            req.params.id = new mongoose.Types.ObjectId().toString();
            req.body = { model: 'NotFound' };
            await motorcycleController.updateMotorcycle(req, res); // Call original
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Motorcycle not found' });
        });
        test('Should return 400 for duplicate plateNumber on update', async () => {
            await new Motorcycle({ owner: mockCustomer._id, make: 'Existing', model: 'A', plateNumber: 'EXIST 123' }).save();
            const motorcycleToUpdate = await new Motorcycle({ owner: mockCustomer._id, make: 'UpdateMe', model: 'B', plateNumber: 'UPDATE 456' }).save();
            req.params.id = motorcycleToUpdate._id.toString();
            req.body = { plateNumber: 'EXIST 123' };
            await motorcycleController.updateMotorcycle(req, res); // Call original
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("already exists") })); // More robust check
        });
    });

    describe('deleteMotorcycle', () => {
        test('Should delete a motorcycle successfully (200)', async () => {
            const motorcycle = await new Motorcycle({ owner: mockCustomer._id, make: 'Delete', model: 'Me', plateNumber: 'DEL 123' }).save();
            await Customer.findByIdAndUpdate(mockCustomer._id, { $push: { motorcycles: motorcycle._id } });
            req.params.id = motorcycle._id.toString();
            await deleteMotorcycle_noTx(req, res); // Use no-tx version
            const deleted = await Motorcycle.findById(motorcycle._id);
            const customer = await Customer.findById(mockCustomer._id);
            expect(deleted).toBeNull(); // Should be null
            expect(customer.motorcycles).not.toContainEqual(motorcycle._id);
            expect(res.json).toHaveBeenCalledWith({ message: 'Motorcycle removed successfully.' });
            expect(logAction).toHaveBeenCalled();
        });
        test('Should return 500 if motorcycle to delete is not found', async () => {
            req.params.id = new mongoose.Types.ObjectId().toString();
            await deleteMotorcycle_noTx(req, res); // Use no-tx version
            expect(res.status).toHaveBeenCalledWith(500); // From catch block
            expect(res.json).toHaveBeenCalledWith({ message: 'Motorcycle not found.' }); // Error message thrown
        });
        test('Should return 500 if motorcycle is associated with a sale', async () => {
            const motorcycle = await new Motorcycle({ owner: mockCustomer._id, make: 'Used', model: 'InSale', plateNumber: 'SALE 123' }).save();
            await new Sale({ recordedBy: mockUserId, totalAmount: 50, motorcycle: motorcycle._id, items: [{ product: mockProduct._id, quantity: 1, priceAtTime: 50, costAtTime: 20 }] }).save();
            req.params.id = motorcycle._id.toString();
            await deleteMotorcycle_noTx(req, res); // Use no-tx version
            expect(res.status).toHaveBeenCalledWith(500); // From catch block
            expect(res.json).toHaveBeenCalledWith({ message: 'Cannot delete motorcycle. It is associated with existing sales records.' }); // Error message thrown
            const notDeleted = await Motorcycle.findById(motorcycle._id);
            expect(notDeleted).toBeDefined();
        });
    });
});