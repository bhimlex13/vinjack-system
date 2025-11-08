// server/routes/settingsRoutes.js
const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  getGlobalSetting,
  updateGlobalSetting,
  triggerManualBackupToGCS,
  getBackupSettings,
  updateBackupSettings,
  restoreBackup,
  listGCSBackups
} = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Personal notification settings (accessible by all logged-in users)
router.route('/')
  .get(protect, getSettings)
  .put(protect, updateSettings);

// Global app settings (Super Admin only)
router.route('/global/:key')
  .get(protect, authorize('Super Admin'), getGlobalSetting); // <-- UPDATED
router.route('/global')
  .put(protect, authorize('Super Admin'), updateGlobalSetting); // <-- UPDATED

// Automated backup configuration (Super Admin only)
router.route('/backup/config')
    .get(protect, authorize('Super Admin'), getBackupSettings) // <-- UPDATED
    .put(protect, authorize('Super Admin'), updateBackupSettings); // <-- UPDATED

// Manual Backup Trigger Route (Super Admin only)
router.route('/backup/gcs')
    .post(protect, authorize('Super Admin'), triggerManualBackupToGCS); // <-- UPDATED

// List GCS Backups Route (Super Admin only)
router.route('/backup/list')
    .get(protect, authorize('Super Admin'), listGCSBackups); // <-- UPDATED

// Restore from GCS Backup Route (Super Admin only)
router.route('/backup/restore')
    .post(protect, authorize('Super Admin'), restoreBackup); // <-- UPDATED

module.exports = router;