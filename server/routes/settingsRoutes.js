// server/routes/settingsRoutes.js
const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  getGlobalSetting,
  updateGlobalSetting,
  triggerManualBackupToGCS, // <-- Import RENAMED function
  getBackupSettings,
  updateBackupSettings,
  restoreBackup,           // <-- Import MODIFIED function
  listGCSBackups           // <-- Import NEW function
} = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/authMiddleware');
// --- REMOVE upload middleware import ---
// const { handleBackupUpload } = require('../middleware/backupUploadMiddleware');

// Personal notification settings (accessible by all logged-in users)
router.route('/')
  .get(protect, getSettings)
  .put(protect, updateSettings);

// Global app settings (Owner only)
router.route('/global/:key')
  .get(protect, authorize('Owner'), getGlobalSetting);
router.route('/global')
  .put(protect, authorize('Owner'), updateGlobalSetting);

// Automated backup configuration (Owner only)
router.route('/backup/config')
    .get(protect, authorize('Owner'), getBackupSettings)
    .put(protect, authorize('Owner'), updateBackupSettings);

// --- MODIFIED: Manual Backup Trigger Route (Owner only) ---
// Changed to POST and new endpoint/controller
router.route('/backup/gcs')
    .post(protect, authorize('Owner'), triggerManualBackupToGCS);

// --- NEW: List GCS Backups Route (Owner only) ---
router.route('/backup/list')
    .get(protect, authorize('Owner'), listGCSBackups);

// --- MODIFIED: Restore from GCS Backup Route (Owner only) ---
// Removed handleBackupUpload middleware, points to modified controller
router.route('/backup/restore')
    .post(protect, authorize('Owner'), restoreBackup);
// --- END MODIFICATIONS ---

module.exports = router;