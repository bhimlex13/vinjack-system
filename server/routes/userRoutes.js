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
    getMe,
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
router.put('/force-change-password', protect, forceChangePassword);
router.post('/logout', protect, logoutUser);

// --- Dashboard Preferences Routes (Accessible by Admin and Super Admin) ---
router.route('/dashboard-preferences')
  .get(protect, authorize('Super Admin', 'Admin'), getDashboardPreferences)
  .put(protect, authorize('Super Admin', 'Admin'), saveDashboardPreferences);

// --- Super Admin routes ---
router.route('/')
    .get(protect, authorize('Super Admin'), getAllUsers);

router.post('/create', protect, authorize('Super Admin'), createUserByAdmin);

router.route('/:id')
    .put(protect, authorize('Super Admin'), updateUser) 
    .delete(protect, authorize('Super Admin'), deleteUser);

router.get('/details/:id', protect, authorize('Super Admin'), getUserDetails);

router.post('/:id/admin-reset-password', protect, authorize('Super Admin'), adminResetPassword);

module.exports = router;