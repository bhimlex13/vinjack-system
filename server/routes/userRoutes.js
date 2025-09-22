// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { 
    createUserByAdmin,
    loginUser, 
    forceChangePassword,
    getAllUsers, 
    updateUser, 
    deleteUser,
    requestProfileUpdate,
    approveUserUpdate,
    rejectUserUpdate,
    getMe,
    verifyOwnerUpdate,
    getUserDetails // <-- 1. IMPORT THE NEW CONTROLLER
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', loginUser);

// --- User's own profile routes ---
router.get('/me', protect, getMe);
router.put('/profile', protect, requestProfileUpdate);
router.post('/profile/verify', protect, verifyOwnerUpdate);
router.put('/force-change-password', protect, forceChangePassword);

// --- Admin (Owner) routes ---
router.route('/')
    .get(protect, authorize('Owner'), getAllUsers);

router.post('/create', protect, authorize('Owner'), createUserByAdmin);

router.route('/:id')
    .put(protect, authorize('Owner'), updateUser) 
    .delete(protect, authorize('Owner'), deleteUser);

// --- 2. ADD THE NEW ROUTE FOR FETCHING USER DETAILS ---
router.get('/details/:id', protect, authorize('Owner'), getUserDetails);

router.post('/:id/approve', protect, authorize('Owner'), approveUserUpdate);
router.post('/:id/reject', protect, authorize('Owner'), rejectUserUpdate);

module.exports = router;