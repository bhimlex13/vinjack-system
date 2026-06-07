// __tests__/reportController.test.js

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const reportController = require('../controllers/reportController');
const Sale = require('../models/saleModel');
const Product = require('../models/productModel');
const PurchaseOrder = require('../models/purchaseOrderModel');
const Service = require('../models/serviceModel');
const Category = require('../models/categoryModel');
const Brand = require('../models/brandModel');
const Delivery = require('../models/deliveryModel');
const Movement = require('../models/movementModel');
const Return = require('../models/returnModel');
const User = require('../models/userModel');
const Supplier = require('../models/supplierModel');

let mongoServer;
let mockUser, mockUserId, req, res;
let product1, product2, service1, category1, supplier1;
let saleToday1, saleToday2, saleLastMonth;

// Helper function (keep as is)
const setManilaDate = (year, month, day, hour = 0, minute = 0, second = 0) => {
    const date = new Date(Date.UTC(year, month, day, hour, minute, second));
    date.setUTCHours(date.getUTCHours() - 8);
    return date;
};

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
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
    jest.clearAllMocks();

    // --- Create Mock Data ---
    const userDoc = await new User({ username: 'reportUser', password: 'password', email: 'report@test.com', role: 'Super Admin', fullName: 'Report Tester' }).save();
    mockUserId = userDoc._id;
    mockUser = { _id: mockUserId, id: mockUserId.toString(), username: 'reportUser', fullName: 'Report Tester' };

    category1 = await new Category({ name: 'Oils' }).save();
    supplier1 = await new Supplier({ name: 'Oil Supplier' }).save();
    const brand1 = await new Brand({ name: 'BrandX' }).save();

    product1 = await new Product({ name: 'Oil A', itemCode: 'OA001', brand: brand1._id, category: category1._id, cost: 50, price: 100, quantity: 10, maxStock: 20, suppliers: [supplier1._id] }).save();
    product2 = await new Product({ name: 'Filter B', itemCode: 'FB002', brand: brand1._id, category: category1._id, cost: 20, price: 40, quantity: 5, maxStock: 15, reorderLevel: 2 }).save();

    service1 = await new Service({ name: 'Oil Change', charge: 150 }).save();

    // --- Create Sales Data using helper ---
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    saleToday1 = await new Sale({ // Today 2 AM Manila
        recordedBy: mockUserId, totalAmount: 140, items: [{ product: product1._id, quantity: 1, priceAtTime: 100, costAtTime: 50 },{ product: product2._id, quantity: 1, priceAtTime: 40, costAtTime: 20 }], createdAt: setManilaDate(year, month, day, 2)
    }).save();
    saleToday2 = await new Sale({ // Today 5 AM Manila
        recordedBy: mockUserId, totalAmount: 250, items: [{ product: product1._id, quantity: 1, priceAtTime: 100, costAtTime: 50 }], services: [{ service: service1._id, priceAtTime: 150 }], createdAt: setManilaDate(year, month, day, 5)
    }).save();
    const lastMonthDate = new Date(today); lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    saleLastMonth = await new Sale({ // Last month 10 AM Manila
        recordedBy: mockUserId, totalAmount: 40, items: [{ product: product2._id, quantity: 1, priceAtTime: 40, costAtTime: 20 }], createdAt: setManilaDate(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), lastMonthDate.getDate(), 10)
    }).save();

    // Add PO, Delivery, Movement, Return using helper
    await new PurchaseOrder({ poNumber: 'PO-PENDING', supplier: supplier1._id, status: 'Pending', items: [], totalAmount: 0 }).save();
    await new Delivery({ deliveryDate: setManilaDate(year, month, day, 1), productsReceived: [{product: product1._id, quantity: 5, costAtTime: 50}], recordedBy: mockUserId, totalCost: 250, supplier: supplier1._id}).save();
    await new Movement({ product: product2._id, type: 'ADJUSTMENT', quantityChange: -1, stockBefore: 6, stockAfter: 5, reason: 'Test Adj', recordedBy: mockUserId, createdAt: setManilaDate(year, month, day, 3) }).save();
    await new Return({ originalSale: saleToday1._id, reason: 'Test Return', outcome: 'Restocked', totalRefundAmount: 100, recordedBy: mockUserId, itemsReturned: [{product: product1._id, quantity: 1, priceAtTime: 100}], createdAt: setManilaDate(year, month, day, 4) }).save();

    // --- Setup Mock Request & Response ---
    req = { user: mockUser, query: {}, params: {} };
    res = { status: jest.fn(() => res), json: jest.fn() };
    // --- End Mock Setup ---
});


describe('Report Controller Unit Tests', () => {

    describe('getDashboardSummary', () => {
        // ... tests for "today", "all", "categoryId" remain the same ...
         test('Should return correct summary for "today"', async () => {
            req.query = { range: 'today' };
            await reportController.getDashboardSummary(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                totalRevenue: 390.00,
                totalProfit: 270.00,
                totalSales: 2,
                totalQuantitySold: 3
            }));
        });

         test('Should return correct summary for "all"', async () => {
            req.query = { range: 'all' };
            await reportController.getDashboardSummary(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                totalRevenue: 430.00,
                totalProfit: 290.00,
                totalSales: 3,
                totalQuantitySold: 4
            }));
        });


        test('Should filter summary by categoryId', async () => {
            const category2 = await new Category({ name: 'Filters' }).save();
            const airFilterProduct = await new Product({ name: 'Air Filter', itemCode: 'AF003', brand: new mongoose.Types.ObjectId(), category: category2._id, cost: 30, price: 60, quantity: 8, maxStock: 10 }).save();
            await new Sale({ recordedBy: mockUserId, totalAmount: 60, items: [{ product: airFilterProduct._id, quantity: 1, priceAtTime: 60, costAtTime: 30 }], createdAt: setManilaDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 6) }).save(); // Today 6 AM

            req.query = { range: 'today', categoryId: category1._id.toString() }; // Filter for 'Oils' category
            await reportController.getDashboardSummary(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                totalRevenue: 390.00, // Excludes the Air Filter sale
                totalProfit: 270.00,
                totalSales: 2,
                totalQuantitySold: 3,
                totalSKUs: 2,
                totalStockQuantity: 15,
                 categorySummary: expect.arrayContaining([
                     expect.objectContaining({ categoryName: 'Oils', skuCount: 2, totalStock: 15 })
                 ])
            }));
            const responseData = res.json.mock.calls[0][0];
            expect(responseData.categorySummary.find(cat => cat.categoryName === 'Filters')).toBeUndefined();
        });


        test('Should handle errors gracefully (500)', async () => {
            req.query = { range: 'today' };
            // Force an error
            jest.spyOn(Sale, 'aggregate').mockRejectedValueOnce(new Error('Aggregation failed'));

            // --- HIDE CONSOLE.ERROR FOR THIS TEST ---
            const originalConsoleError = console.error; // Store original
            console.error = jest.fn(); // Replace with mock
            // --- END HIDE ---

            await reportController.getDashboardSummary(req, res);

            // --- RESTORE CONSOLE.ERROR ---
            console.error = originalConsoleError; // Restore original
            // --- END RESTORE ---

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Server Error fetching dashboard summary.' }));
        });
    });

    describe('getSalesReport', () => {
        // ... tests remain the same ...
        test('Should return sales within a date range', async () => {
             const today = new Date();
             const startDate = setManilaDate(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().split('T')[0];
             const endDate = startDate;
            req.query = { startDate, endDate };
            await reportController.getSalesReport(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.any(Array));
            const sales = res.json.mock.calls[0][0];
            expect(sales.length).toBe(2);
            expect(sales[0].totalAmount).toBe(250);
            expect(sales[1].totalAmount).toBe(140);
        });
         test('Should return all sales if no date range', async () => {
            req.query = {};
            await reportController.getSalesReport(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.any(Array));
            const sales = res.json.mock.calls[0][0];
            expect(sales.length).toBe(3);
        });

    });

    describe('getLowStockProducts', () => {
        // ... test remains the same ...
        test('Should return products with Low, Critical, or Out of Stock status', async () => {
            const lowBolt = await new Product({ name: 'Low Bolt', itemCode: 'LB004', brand: new mongoose.Types.ObjectId(), category: category1._id, cost: 1, price: 3, quantity: 1, maxStock: 10, reorderLevel: 1, stockStatus: 'Critical' }).save();
            await Product.findByIdAndUpdate(product2._id, { stockStatus: 'Low'});
            // Update product1 status explicitly for clarity in test
            await Product.findByIdAndUpdate(product1._id, { stockStatus: 'Healthy'}); // Assuming quantity 10 is healthy

            await reportController.getLowStockProducts(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.any(Array));
            const products = res.json.mock.calls[0][0];

            // Expect only 2 products now (product2 and lowBolt)
            expect(products.length).toBe(2);

            const foundLowBolt = products.find(p => p.name === 'Low Bolt');
            const foundFilterB = products.find(p => p.name === 'Filter B');
            const foundOilA = products.find(p => p.name === 'Oil A'); // Should not be found

            expect(foundLowBolt).toBeDefined();
            expect(foundLowBolt.stockStatus).toBe('Critical');
            expect(foundLowBolt.quantity).toBe(1);

            expect(foundFilterB).toBeDefined();
            expect(foundFilterB.stockStatus).toBe('Low');
            expect(foundFilterB.quantity).toBe(5);

            expect(foundOilA).toBeUndefined(); // Product 1 is Healthy, should not be in results
        });
    });

    describe('getSalesTrend', () => {
        // ... tests remain the same ...
         test('Should return daily trend data for "today"', async () => {
            req.query = { range: 'today' };
            await reportController.getSalesTrend(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.any(Array));
            const trend = res.json.mock.calls[0][0];
            const salesAt2AM = trend.find(t => t._id.endsWith(' 02:00'));
            const salesAt5AM = trend.find(t => t._id.endsWith(' 05:00'));
            expect(salesAt2AM).toBeDefined();
            expect(salesAt5AM).toBeDefined();
            expect(salesAt2AM?.totalSales).toBe(140);
            expect(salesAt5AM?.totalSales).toBe(250);
        });
         test('Should return monthly trend data for "all"', async () => {
             req.query = { range: 'all' };
             await reportController.getSalesTrend(req, res);
             expect(res.json).toHaveBeenCalledWith(expect.any(Array));
             const trend = res.json.mock.calls[0][0];
             expect(trend.length).toBeGreaterThanOrEqual(2);
             const todayMonthStr = new Date().toISOString().slice(0, 7);
             const lastMonthStr = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);
             const todayMonthSales = trend.find(t => t._id === todayMonthStr);
             const lastMonthSales = trend.find(t => t._id === lastMonthStr);
             expect(todayMonthSales).toBeDefined();
             expect(lastMonthSales).toBeDefined();
             expect(todayMonthSales.totalSales).toBe(390);
             expect(lastMonthSales.totalSales).toBe(40);
        });
    });

    describe('getRecentActivities', () => {
        // ... test remains the same ...
        test('Should return a mix of recent activities sorted by date', async () => {
            await reportController.getRecentActivities(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.any(Array));
            const activities = res.json.mock.calls[0][0];

            expect(activities.length).toBeGreaterThanOrEqual(5);
            expect(activities[0].type).toBe('Sale');
            expect(activities[1].type).toBe('Return');
            expect(activities[2].type).toBe('Adjustment');
            expect(activities[3].type).toBe('Sale');
            expect(activities[4].type).toBe('Delivery');

            expect(activities[0].description).toContain('Sale to Walk-in');
            expect(activities[1].description).toContain('Return (Sale #');
            expect(activities[2].description).toContain('Stock Adj. for Filter B');
            expect(activities[4].description).toContain('Delivery from Oil Supplier');
        });
    });

    describe('getPendingPurchaseOrders', () => {
        // ... test remains the same ...
        test('Should return pending POs', async () => {
            await reportController.getPendingPurchaseOrders(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.any(Array));
            const pos = res.json.mock.calls[0][0];
            expect(pos.length).toBe(1);
            expect(pos[0].poNumber).toBe('PO-PENDING');
            expect(pos[0].status).toBe('Pending');
        });
    });
});