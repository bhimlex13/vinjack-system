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
    rejectUserUpdate
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// --- User's own profile update route ---
router.put('/profile', protect, requestProfileUpdate);

// --- Admin (Owner) routes ---
router.route('/')
    .get(protect, authorize('Owner'), getAllUsers);

router.route('/:id')
    .put(protect, authorize('Owner'), updateUser) // This is for role/status changes by the Owner
    .delete(protect, authorize('Owner'), deleteUser);

// --- NEW Owner approval routes ---
router.post('/:id/approve', protect, authorize('Owner'), approveUserUpdate);
router.post('/:id/reject', protect, authorize('Owner'), rejectUserUpdate);

module.exports = router;
