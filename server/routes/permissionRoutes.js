// server/routes/permissionRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllPermissions,
  getRolePermissions,
  updateRolePermissions,
  seedPermissions,
} = require('../controllers/permissionController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All permission routes are for Super Admin only
router.use(protect);
router.use(authorize('Super Admin'));

// @desc    Get the master list of all available permissions
// @route   GET /api/permissions/all
router.get('/all', getAllPermissions);

// @desc    [Admin Only] Seed/Reset the permissions database
// @route   POST /api/permissions/seed
router.post('/seed', seedPermissions);

// @desc    Get or Update a specific role's permissions
// @route   GET /api/permissions/:role
// @route   PUT /api/permissions/:role
router.route('/:role')
  .get(getRolePermissions)
  .put(updateRolePermissions);

module.exports = router;