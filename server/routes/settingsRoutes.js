// server/routes/settingsRoutes.js
const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  getGlobalSetting,
  updateGlobalSetting,
  // --- NEW: Import the backup function ---
  createBackup
} = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Routes for personal user settings
router.route('/').get(protect, getSettings).put(protect, updateSettings);

// Routes for global app settings (Owner only)
router.route('/global').put(protect, authorize('Owner'), updateGlobalSetting);
router.route('/global/:key').get(protect, authorize('Owner'), getGlobalSetting);

// --- NEW: Route for creating a manual backup (Owner only) ---
router.route('/backup/create').get(protect, authorize('Owner'), createBackup);
// --- END NEW ---

module.exports = router;