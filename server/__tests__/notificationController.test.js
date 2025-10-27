// __tests__/notificationController.test.js

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { getNotifications, markNotificationsAsRead } = require('../controllers/notificationController'); // Adjust path
const Notification = require('../models/notificationModel'); // Adjust path
const User = require('../models/userModel'); // Adjust path

let mongoServer;
let mockUser, mockUserId, otherUserId, req, res;

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
    await Notification.deleteMany({});
    await User.deleteMany({});

    // Reset mocks
    jest.clearAllMocks();

    // Create mock users
    const userDoc = await new User({ username: 'testuser', password: 'password', email: 'notify@test.com', role: 'Owner', fullName: 'Notify Tester' }).save();
    mockUserId = userDoc._id;
    mockUser = { _id: mockUserId, id: mockUserId.toString(), username: 'testuser', fullName: 'Notify Tester' }; // This is req.user

    const otherUserDoc = await new User({ username: 'otheruser', password: 'password', email: 'other@test.com', role: 'Clerk', fullName: 'Other User' }).save();
    otherUserId = otherUserDoc._id;

    // --- USE VALID ENUM VALUES ---
    await new Notification({
        user: mockUserId,
        message: 'Notification 1 (unread)',
        type: 'LOW_STOCK', // <-- VALID VALUE
        isRead: false,
        createdAt: new Date('2025-10-27T10:00:00Z') }).save();
    await new Notification({
        user: mockUserId,
        message: 'Notification 2 (read)',
        type: 'USER_ACTION', // <-- VALID VALUE
        isRead: true,
        createdAt: new Date('2025-10-27T11:00:00Z') }).save();
    await new Notification({
        user: mockUserId,
        message: 'Notification 3 (unread)',
        type: 'REQUEST_STATUS', // <-- VALID VALUE
        isRead: false,
        createdAt: new Date('2025-10-27T12:00:00Z') }).save();
    // Notification for another user (should not be returned)
    await new Notification({
        user: otherUserId,
        message: 'Other User Notification',
        type: 'LOW_STOCK', // <-- VALID VALUE
        isRead: false }).save();
    // --- End Fix ---


    // --- Setup Mock Request & Response ---
    req = {
        user: mockUser,
        params: {},
        body: {},
    };
    res = { status: jest.fn(() => res), json: jest.fn() };
    // --- End Mock Setup ---
});

describe('Notification Controller Unit Tests', () => {

    describe('getNotifications', () => {

        test('Should return notifications for the logged-in user, sorted newest first (200)', async () => {
            await getNotifications(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.any(Array));
            const responseData = res.json.mock.calls[0][0];

            expect(responseData.length).toBe(3);
            expect(responseData[0].message).toBe('Notification 3 (unread)');
            expect(responseData[1].message).toBe('Notification 2 (read)');
            expect(responseData[2].message).toBe('Notification 1 (unread)');
        });

         test('Should limit notifications returned (default is 20)', async () => {
            for (let i = 0; i < 25; i++) {
                // --- USE VALID ENUM VALUE ---
                await new Notification({ user: mockUserId, message: `Bulk ${i}`, type: 'LOW_STOCK', isRead: false, createdAt: new Date(Date.now() - i * 1000) }).save();
                // --- End Fix ---
            }

            await getNotifications(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.any(Array));
            const responseData = res.json.mock.calls[0][0];
            expect(responseData.length).toBe(20);
        });


        test('Should return an empty array if user has no notifications (200)', async () => {
            await Notification.deleteMany({ user: mockUserId });
            await getNotifications(req, res);
            expect(res.json).toHaveBeenCalledWith([]);
        });

        test('Should return 500 on server error', async () => {
            jest.spyOn(Notification, 'find').mockImplementation(() => ({
                sort: jest.fn().mockImplementation(() => ({
                    limit: jest.fn().mockRejectedValue(new Error('Database error')),
                })),
            }));

            await getNotifications(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Server Error' }));
        });
    });

    describe('markNotificationsAsRead', () => {

        test('Should mark all unread notifications for the user as read (200)', async () => {
            const initialUnreadCount = await Notification.countDocuments({ user: mockUserId, isRead: false });
            expect(initialUnreadCount).toBe(2);

            await markNotificationsAsRead(req, res);

            const finalUnreadCount = await Notification.countDocuments({ user: mockUserId, isRead: false });
            expect(finalUnreadCount).toBe(0);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Notifications marked as read.' });

            const otherUserUnreadCount = await Notification.countDocuments({ user: otherUserId, isRead: false });
            expect(otherUserUnreadCount).toBe(1);
        });

        test('Should succeed even if there are no unread notifications (200)', async () => {
            await Notification.updateMany({ user: mockUserId, isRead: false }, { $set: { isRead: true } });
            const initialUnreadCount = await Notification.countDocuments({ user: mockUserId, isRead: false });
            expect(initialUnreadCount).toBe(0);

            await markNotificationsAsRead(req, res);

            const finalUnreadCount = await Notification.countDocuments({ user: mockUserId, isRead: false });
            expect(finalUnreadCount).toBe(0);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Notifications marked as read.' });
        });

        test('Should return 500 on server error', async () => {
            jest.spyOn(Notification, 'updateMany').mockRejectedValue(new Error('Update failed'));
            await markNotificationsAsRead(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Server Error' }));
        });
    });
});