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
    verifySelfUpdateWithCode, // <-- UPDATED
    getUserDetails,
    adminResetPassword,
    logoutUser,
    getDashboardPreferences,
    saveDashboardPreferences
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', loginUser);

// --- User's own profile routes (accessible to all logged-in users) ---
router.get('/me', protect, getMe);
router.put('/profile', protect, requestProfileUpdate);
router.post('/profile/verify', protect, verifySelfUpdateWithCode); // <-- UPDATED
router.put('/force-change-password', protect, forceChangePassword);
router.post('/logout', protect, logoutUser);

// --- Dashboard Preferences Routes (Accessible by Admin and Super Admin) ---
router.route('/dashboard-preferences')
  .get(protect, authorize('Super Admin', 'Admin'), getDashboardPreferences) // <-- UPDATED
  .put(protect, authorize('Super Admin', 'Admin'), saveDashboardPreferences); // <-- UPDATED

// --- Super Admin routes ---
router.route('/')
    .get(protect, authorize('Super Admin'), getAllUsers); // <-- UPDATED

router.post('/create', protect, authorize('Super Admin'), createUserByAdmin); // <-- UPDATED

router.route('/:id')
    .put(protect, authorize('Super Admin'), updateUser) // <-- UPDATED
    .delete(protect, authorize('Super Admin'), deleteUser); // <-- UPDATED

router.get('/details/:id', protect, authorize('Super Admin'), getUserDetails); // <-- UPDATED

router.post('/:id/approve', protect, authorize('Super Admin'), approveUserUpdate); // <-- UPDATED
router.post('/:id/reject', protect, authorize('Super Admin'), rejectUserUpdate); // <-- UPDATED

router.post('/:id/admin-reset-password', protect, authorize('Super Admin'), adminResetPassword); // <-- UPDATED

module.exports = router;