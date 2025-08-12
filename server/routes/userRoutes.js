// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { 
    registerUser, 
    loginUser, 
    getAllUsers, 
    updateUser, 
    deleteUser,
    requestProfileUpdate,
    approveUserUpdate,
    rejectUserUpdate,
    getMe,
    verifyOwnerUpdate // ADDED
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// --- User's own profile routes ---
router.get('/me', protect, getMe);
router.put('/profile', protect, requestProfileUpdate);
// ADDED: New route for the owner to verify their update
router.post('/profile/verify', protect, verifyOwnerUpdate);


// --- Admin (Owner) routes ---
router.route('/')
    .get(protect, authorize('Owner'), getAllUsers);

router.route('/:id')
    .put(protect, authorize('Owner'), updateUser) 
    .delete(protect, authorize('Owner'), deleteUser);

router.post('/:id/approve', protect, authorize('Owner'), approveUserUpdate);
router.post('/:id/reject', protect, authorize('Owner'), rejectUserUpdate);

module.exports = router;