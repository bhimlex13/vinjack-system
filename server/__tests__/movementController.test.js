// __tests__/movementController.test.js

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { getProductMovements } = require('../controllers/movementController'); // Adjust path
const Movement = require('../models/movementModel'); // Adjust path
const Product = require('../models/productModel'); // Adjust path for creating mock product
const User = require('../models/userModel'); // Adjust path for creating mock user

let mongoServer;
let mockUser, mockUserId, req, res;
let mockProduct;

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
    // Clear collections
    await Movement.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});

    // Reset mocks
    jest.clearAllMocks();

    // Create mock data
    const userDoc = await new User({ username: 'testuser', password: 'password', email: 'move@test.com', role: 'Owner', fullName: 'Movement Tester' }).save();
    mockUserId = userDoc._id;
    mockUser = { _id: mockUserId, id: mockUserId.toString(), username: 'testuser', fullName: 'Movement Tester' };

    mockProduct = await new Product({ name: 'Test Product', itemCode: 'TP001', brand: new mongoose.Types.ObjectId(), category: new mongoose.Types.ObjectId(), cost: 10, price: 20, maxStock: 10 }).save();

    // --- FIX: Add stockAfter to mock movements ---
    await new Movement({
        product: mockProduct._id,
        type: 'DELIVERY',
        quantityChange: 10,
        stockBefore: 0,
        stockAfter: 10, // Added
        recordedBy: mockUserId,
        createdAt: new Date('2025-10-26T10:00:00Z')
    }).save();
    await new Movement({
        product: mockProduct._id,
        type: 'SALE',
        quantityChange: -2,
        stockBefore: 10,
        stockAfter: 8, // Added
        recordedBy: mockUserId,
        createdAt: new Date('2025-10-27T11:00:00Z')
    }).save();
    await new Movement({
        product: mockProduct._id,
        type: 'ADJUSTMENT',
        quantityChange: -1,
        stockBefore: 8,
        stockAfter: 7, // Added
        reason: 'Damaged',
        recordedBy: mockUserId,
        createdAt: new Date('2025-10-27T12:00:00Z')
    }).save();

    // Create a movement for a different product (should not be returned)
    const otherProduct = await new Product({ name: 'Other Product', itemCode: 'OP002', brand: new mongoose.Types.ObjectId(), category: new mongoose.Types.ObjectId(), cost: 5, price: 10, maxStock: 5 }).save();
    await new Movement({
        product: otherProduct._id,
        type: 'DELIVERY',
        quantityChange: 5,
        stockBefore: 0,
        stockAfter: 5, // Added
        recordedBy: mockUserId
    }).save();
    // --- End Fix ---


    // --- Setup Mock Request & Response ---
    req = {
        user: mockUser,
        params: {},
    };
    res = { status: jest.fn(() => res), json: jest.fn() };
    // --- End Mock Setup ---
});

describe('Movement Controller Unit Tests', () => {

    describe('getProductMovements', () => {

        test('Should return all movements for a specific product, sorted by date descending (200)', async () => {
            req.params.productId = mockProduct._id.toString();

            await getProductMovements(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.any(Array));
            const responseData = res.json.mock.calls[0][0];

            expect(responseData.length).toBe(3);
            expect(responseData[0].type).toBe('ADJUSTMENT');
            expect(responseData[0].stockAfter).toBe(7); // Check added field
            expect(responseData[0].recordedBy.fullName).toBe('Movement Tester');
            expect(responseData[1].type).toBe('SALE');
            expect(responseData[2].type).toBe('DELIVERY');
        });

        test('Should return an empty array if product has no movements (200)', async () => {
            const productWithNoMovements = await new Product({ name: 'No Move Product', itemCode: 'NM003', brand: new mongoose.Types.ObjectId(), category: new mongoose.Types.ObjectId(), cost: 1, price: 2, maxStock: 1 }).save();
            req.params.productId = productWithNoMovements._id.toString();

            await getProductMovements(req, res);

            expect(res.json).toHaveBeenCalledWith([]);
        });

        test('Should return 500 on server error', async () => {
            req.params.productId = mockProduct._id.toString();

            jest.spyOn(Movement, 'find').mockImplementation(() => ({
                sort: jest.fn().mockImplementation(() => ({
                    populate: jest.fn().mockRejectedValue(new Error('Database error')),
                })),
            }));

            await getProductMovements(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Server error fetching movement history.',
            }));
        });
    });
});