// server/routes/appSettingsRoutes.js
const express = require('express');
const router = express.Router();
const { getSetting, updateSetting } = require('../controllers/appSettingsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Only the Owner can get or update app settings
router.route('/').put(protect, authorize('Owner'), updateSetting);
router.route('/:key').get(protect, authorize('Owner'), getSetting);

module.exports = router;