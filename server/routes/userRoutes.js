// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { 
    createUserByAdmin, // MODIFIED
    loginUser, 
    forceChangePassword, // ADDED
    getAllUsers, 
    updateUser, 
    deleteUser,
    requestProfileUpdate,
    approveUserUpdate,
    rejectUserUpdate,
    getMe,
    verifyOwnerUpdate
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
// router.post('/register', registerUser); // REMOVED
router.post('/login', loginUser);

// --- User's own profile routes ---
router.get('/me', protect, getMe);
router.put('/profile', protect, requestProfileUpdate);
router.post('/profile/verify', protect, verifyOwnerUpdate);
router.put('/force-change-password', protect, forceChangePassword); // ADDED

// --- Admin (Owner) routes ---
router.route('/')
    .get(protect, authorize('Owner'), getAllUsers);

router.post('/create', protect, authorize('Owner'), createUserByAdmin); // ADDED

router.route('/:id')
    .put(protect, authorize('Owner'), updateUser) 
    .delete(protect, authorize('Owner'), deleteUser);

router.post('/:id/approve', protect, authorize('Owner'), approveUserUpdate);
router.post('/:id/reject', protect, authorize('Owner'), rejectUserUpdate);

module.exports = router;