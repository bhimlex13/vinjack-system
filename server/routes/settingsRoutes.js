// server/routes/settingsRoutes.js
const express = require('express');
const router = express.Router();
const {
  getSettings,          // User notification settings
  updateSettings,       // User notification settings
  getGlobalSetting,     // Specific global setting (e.g., /api/settings/global/some_key)
  updateGlobalSetting,  // Update specific global setting (e.g., PUT /api/settings/global)
  createBackup,         // Manual backup download
  getBackupSettings,    // Get backup schedule config
  updateBackupSettings  // Update backup schedule config
} = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// --- Routes for personal user notification settings ---
// GET /api/settings/ - Get current user's notification settings
// PUT /api/settings/ - Update current user's notification settings
router.route('/')
  .get(protect, getSettings)
  .put(protect, updateSettings);

// --- Routes for Backup Configuration (Owner only) ---
// GET /api/settings/backup/config - Get automated backup settings (enabled, time)
// PUT /api/settings/backup/config - Update automated backup settings
router.route('/backup/config')
  .get(protect, authorize('Owner'), getBackupSettings)
  .put(protect, authorize('Owner'), updateBackupSettings);

// --- Route for creating a manual backup download (Owner only) ---
// GET /api/settings/backup/create - Trigger and download a manual backup
router.route('/backup/create')
  .get(protect, authorize('Owner'), createBackup);

// --- Routes for individual global app settings (Owner only - Legacy/Specific Use) ---
// GET /api/settings/global/:key - Get a specific global setting by its key
// PUT /api/settings/global - Update a specific global setting (expects key and value in body)
router.route('/global/:key')
  .get(protect, authorize('Owner'), getGlobalSetting);
router.route('/global') // Note: This uses PUT and expects { key: '...', value: '...' } in body
  .put(protect, authorize('Owner'), updateGlobalSetting);


module.exports = router;