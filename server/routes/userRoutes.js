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
    getUserDetails,
    adminResetPassword,
    logoutUser,
    // --- NEW: Import preference controllers ---
    getDashboardPreferences,
    saveDashboardPreferences
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', loginUser);

// --- User's own profile routes ---
router.get('/me', protect, getMe);
router.put('/profile', protect, requestProfileUpdate);
router.post('/profile/verify', protect, verifyOwnerUpdate);
router.put('/force-change-password', protect, forceChangePassword);
router.post('/logout', protect, logoutUser);

// --- NEW: Dashboard Preferences Routes (Owner Only) ---
router.route('/dashboard-preferences')
  .get(protect, authorize('Owner'), getDashboardPreferences)
  .put(protect, authorize('Owner'), saveDashboardPreferences);
// --- END NEW ---

// --- Admin (Owner) routes ---
router.route('/')
    .get(protect, authorize('Owner'), getAllUsers);

router.post('/create', protect, authorize('Owner'), createUserByAdmin);

router.route('/:id')
    .put(protect, authorize('Owner'), updateUser)
    .delete(protect, authorize('Owner'), deleteUser);

router.get('/details/:id', protect, authorize('Owner'), getUserDetails);

router.post('/:id/approve', protect, authorize('Owner'), approveUserUpdate);
router.post('/:id/reject', protect, authorize('Owner'), rejectUserUpdate);

router.post('/:id/admin-reset-password', protect, authorize('Owner'), adminResetPassword);

module.exports = router;