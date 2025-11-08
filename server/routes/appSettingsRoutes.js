// server/routes/appSettingsRoutes.js
const express = require('express');
const router = express.Router();
const { getSetting, updateSetting } = require('../controllers/appSettingsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Only the Super Admin can get or update app settings
router.route('/').put(protect, authorize('Super Admin'), updateSetting); // <-- UPDATED
router.route('/:key').get(protect, authorize('Super Admin'), getSetting); // <-- UPDATED

module.exports = router;