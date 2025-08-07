// server/routes/settingsRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getSettings, 
  updateSettings,
  getGlobalSetting,
  updateGlobalSetting
} = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Routes for personal user settings
router.route('/').get(protect, getSettings).put(protect, updateSettings);

// Routes for global app settings (Owner only)
router.route('/global').put(protect, authorize('Owner'), updateGlobalSetting);
router.route('/global/:key').get(protect, authorize('Owner'), getGlobalSetting);

module.exports = router;