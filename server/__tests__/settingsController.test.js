// __tests__/settingsController.test.js

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const settingsController = require('../controllers/settingsController');
const User = require('../models/userModel');
const Setting = require('../models/settingModel');
const Product = require('../models/productModel');
// Import other models used in backup if needed for setup
const Category = require('../models/categoryModel');
const Brand = require('../models/brandModel');
const Supplier = require('../models/supplierModel');
// ... add others as needed for more detailed backup verification ...
const logAction = require('../utils/logger');
const backupService = require('../utils/backupService');

// Mock dependencies
jest.mock('../utils/logger', () => jest.fn());
jest.mock('../utils/backupService', () => ({
    restoreDatabase: jest.fn(),
}));

let mongoServer;
let mockUser, mockUserId, req, res;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    await Setting.createIndexes();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Setting.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({}); // Clear added models
    await Brand.deleteMany({});
    await Supplier.deleteMany({});
    // Clear other models if used...

    // Reset mocks
    jest.clearAllMocks();

    // Create mock user
    const userDoc = await new User({
        username: 'settingsUser', password: 'password', email: 'settings@test.com', role: 'Super Admin', fullName: 'Settings Tester',
        emailSettings: { notificationsEnabled: true, notificationTime: '09:00' }
    }).save();
    mockUserId = userDoc._id;
    mockUser = { _id: mockUserId, id: mockUserId.toString(), username: 'settingsUser', fullName: 'Settings Tester' };

    await new Setting({ key: 'shopName', value: 'Old Shop Name' }).save();

    req = { user: mockUser, params: {}, body: {}, file: undefined };
    res = { status: jest.fn(() => res), json: jest.fn(), setHeader: jest.fn() };
});

describe('Settings Controller Unit Tests', () => {

    // --- Tests for getSettings, updateSettings, getGlobalSetting, updateGlobalSetting remain the same ---
     describe('getSettings (User Email Settings)', () => {
        test('Should return user email settings (200)', async () => {
            await settingsController.getSettings(req, res);
            expect(res.json).toHaveBeenCalledWith({ notificationsEnabled: true, notificationTime: '09:00' });
        });
        test('Should return default settings if user has none (200)', async () => {
            const userNoSettingsDoc = await new User({ username: 'nosettings', password: 'pw', email: 'noset@test.com', role: 'Salesperson', fullName: 'No Settings' }).save();
            req.user = { _id: userNoSettingsDoc._id, id: userNoSettingsDoc._id.toString() };
            await settingsController.getSettings(req, res);
            expect(res.json).toHaveBeenCalledWith({ notificationsEnabled: true, notificationTime: '08:00' });
        });
    });
    describe('updateSettings (User Email Settings)', () => {
        test('Should update user email settings successfully (200)', async () => {
            req.body = { notificationsEnabled: false, notificationTime: '10:30' };
            await settingsController.updateSettings(req, res);
            const updatedUser = await User.findById(mockUserId);
            expect(updatedUser.emailSettings.notificationsEnabled).toBe(false);
            expect(updatedUser.emailSettings.notificationTime).toBe('10:30');
            expect(res.json).toHaveBeenCalledWith({ notificationsEnabled: false, notificationTime: '10:30' });
        });
        test('Should handle partial update (only time) (200)', async () => {
            req.body = { notificationTime: '07:15' };
            await settingsController.updateSettings(req, res);
            const updatedUser = await User.findById(mockUserId);
            expect(updatedUser.emailSettings.notificationsEnabled).toBe(true);
            expect(updatedUser.emailSettings.notificationTime).toBe('07:15');
            expect(res.json).toHaveBeenCalledWith({ notificationsEnabled: true, notificationTime: '07:15' });
        });
        test('Should return 400 for invalid time format', async () => {
            req.body = { notificationTime: 'invalid-time' };
            await settingsController.updateSettings(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Invalid notification time format. Use HH:MM.' });
        });
    });
    describe('getGlobalSetting', () => {
        test('Should return a global setting by key (200)', async () => {
            req.params.key = 'shopName';
            await settingsController.getGlobalSetting(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ key: 'shopName', value: 'Old Shop Name' }));
        });
        test('Should return 404 if global setting key not found', async () => {
            req.params.key = 'nonExistentKey';
            await settingsController.getGlobalSetting(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Setting not found' });
        });
    });
    describe('updateGlobalSetting', () => {
        test('Should update an existing global setting (200)', async () => {
            req.body = { key: 'shopName', value: 'New Shop Name' };
            await settingsController.updateGlobalSetting(req, res);
            const updatedSetting = await Setting.findOne({ key: 'shopName' });
            expect(updatedSetting.value).toBe('New Shop Name');
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ key: 'shopName', value: 'New Shop Name' }));
            expect(logAction).toHaveBeenCalledWith(mockUser, 'UPDATE_APP_SETTINGS', "Updated global setting: 'shopName' to 'New Shop Name'", expect.any(Object));
        });
        test('Should create a new global setting (upsert) (200)', async () => {
            req.body = { key: 'shopAddress', value: '123 Main St' };
            await settingsController.updateGlobalSetting(req, res);
            const newSetting = await Setting.findOne({ key: 'shopAddress' });
            expect(newSetting).toBeDefined();
            expect(newSetting.value).toBe('123 Main St');
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ key: 'shopAddress', value: '123 Main St' }));
            expect(logAction).toHaveBeenCalledWith(mockUser, 'UPDATE_APP_SETTINGS', "Updated global setting: 'shopAddress' to '123 Main St'", expect.any(Object));
        });
        test('Should return 400 if key or value is missing', async () => {
            req.body = { key: 'shopPhone' };
            await settingsController.updateGlobalSetting(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Key and value are required.' });
        });
    });

    describe('createBackup', () => {
        test('Should create and send backup data as JSON (200)', async () => {
            await new Product({ name: 'Backup Prod', itemCode: 'BP001', brand: new mongoose.Types.ObjectId(), category: new mongoose.Types.ObjectId(), cost: 1, price: 2, maxStock: 5 }).save();

            // --- HIDE CONSOLE LOGS ---
            const originalConsoleLog = console.log; console.log = jest.fn();
            // --- END HIDE ---

            await settingsController.createBackup(req, res);

            // --- RESTORE CONSOLE LOG ---
            console.log = originalConsoleLog;
            // --- END RESTORE ---

            expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment; filename="vinjack-manual-backup-'));
            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                users: expect.any(Array), products: expect.any(Array), settings: expect.any(Array),
            }));
            const responseData = res.json.mock.calls[0][0];
            expect(responseData.products.length).toBe(1);
            expect(responseData.products[0].name).toBe('Backup Prod');

            // --- FIX: Correct logAction assertion (3 arguments) ---
            expect(logAction).toHaveBeenCalledWith(
                mockUser,
                'DATA_EXPORT',
                expect.stringContaining('Performed manual data backup. Filename: vinjack-manual-backup-')
                // No 4th argument expected
            );
            // --- END FIX ---
        });

         test('Should handle error during backup creation (500)', async () => {
             jest.spyOn(Product, 'find').mockImplementationOnce(() => ({
                 lean: jest.fn().mockRejectedValue(new Error('Backup fetch error'))
             }));

            // --- HIDE CONSOLE LOGS/ERRORS ---
            const originalConsoleLog = console.log; console.log = jest.fn();
            const originalConsoleError = console.error; console.error = jest.fn();
            // --- END HIDE ---

            await settingsController.createBackup(req, res);

            // --- RESTORE CONSOLE LOGS/ERRORS ---
            console.log = originalConsoleLog;
            console.error = originalConsoleError;
            // --- END RESTORE ---

             expect(res.status).toHaveBeenCalledWith(500);
             expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                 message: 'Server error during manual backup.',
                 error: 'Backup fetch error'
             }));
             expect(logAction).not.toHaveBeenCalledWith(mockUser, 'DATA_EXPORT', expect.anything()); // Ensure EXPORT log didn't run
         });
    });

    // --- Tests for Backup Schedule Settings remain the same ---
     describe('Backup Schedule Settings', () => {
        test('getBackupSettings should return defaults if not set', async () => {
            await settingsController.getBackupSettings(req, res);
            expect(res.json).toHaveBeenCalledWith({ enabled: false, time: '02:00' });
        });
        test('getBackupSettings should return saved settings', async () => {
            await new Setting({ key: 'backup_schedule_enabled', value: 'true' }).save();
            await new Setting({ key: 'backup_schedule_time', value: '03:15' }).save();
            await settingsController.getBackupSettings(req, res);
            expect(res.json).toHaveBeenCalledWith({ enabled: true, time: '03:15' });
        });
        test('updateBackupSettings should save settings', async () => {
            req.body = { enabled: true, time: '04:00' };
            await settingsController.updateBackupSettings(req, res);
            const enabledSetting = await Setting.findOne({ key: 'backup_schedule_enabled' });
            const timeSetting = await Setting.findOne({ key: 'backup_schedule_time' });
            expect(enabledSetting.value).toBe('true');
            expect(timeSetting.value).toBe('04:00');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Backup settings updated successfully.' });
            expect(logAction).toHaveBeenCalledWith(mockUser, 'UPDATE_APP_SETTINGS', 'Updated automated backup settings (Enabled: true, Time: 04:00)');
        });
        test('updateBackupSettings should return 400 for invalid time', async () => {
            req.body = { enabled: true, time: '25:00' };
            await settingsController.updateBackupSettings(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Invalid time format. Use HH:MM (24-hour format).' });
        });
         test('updateBackupSettings should return 400 for invalid enabled type', async () => {
            req.body = { enabled: 'yes', time: '01:00' };
            await settingsController.updateBackupSettings(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Invalid value for enabled. Must be true or false.' });
        });
    });

    describe('restoreBackup', () => {
        test('Should restore backup successfully (200)', async () => {
            req.file = { path: '/fake/path/backup.json', originalname: 'backup.json' };
            backupService.restoreDatabase.mockResolvedValue();

            // --- HIDE CONSOLE LOG ---
            const originalConsoleLog = console.log; console.log = jest.fn();
            // --- END HIDE ---

            await settingsController.restoreBackup(req, res);

            // --- RESTORE CONSOLE LOG ---
            console.log = originalConsoleLog;
            // --- END RESTORE ---

            expect(backupService.restoreDatabase).toHaveBeenCalledWith('/fake/path/backup.json');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Database restore successful. All data has been overwritten with the backup.' });
            expect(logAction).toHaveBeenCalledWith(mockUser, 'DATA_RESTORE_INITIATED', expect.stringContaining('Initiated database restore from file: backup.json'), expect.any(Object));
        });

        test('Should return 400 if no backup file provided', async () => {
            req.file = undefined;
            await settingsController.restoreBackup(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'No backup file found.' });
            expect(backupService.restoreDatabase).not.toHaveBeenCalled();
        });

        test('Should return 500 if restoreDatabase fails', async () => {
            req.file = { path: '/fake/path/fail.json', originalname: 'fail.json' };
            const errorMsg = 'Restore failed horribly';
            backupService.restoreDatabase.mockRejectedValue(new Error(errorMsg));

            // --- HIDE CONSOLE LOGS/ERRORS ---
            const originalConsoleLog = console.log; console.log = jest.fn();
            const originalConsoleError = console.error; console.error = jest.fn();
            // --- END HIDE ---

            await settingsController.restoreBackup(req, res);

            // --- RESTORE CONSOLE LOGS/ERRORS ---
             console.log = originalConsoleLog;
             console.error = originalConsoleError;
            // --- END RESTORE ---

            expect(backupService.restoreDatabase).toHaveBeenCalledWith('/fake/path/fail.json');
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: errorMsg })); // Check the error message propagation
            expect(logAction).toHaveBeenCalledWith(mockUser, 'DATA_RESTORE_FAILED', `Failed to restore database from file: fail.json. Error: ${errorMsg}`, expect.any(Object));
        });
    });
});