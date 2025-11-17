// server/controllers/settingsController.js
const User = require('../models/userModel');
const Setting = require('../models/settingModel');
const {
  restoreDatabase,
  backupDatabaseToGCS,
  listBackupsFromGCS,
  downloadBackupFromGCS
} = require('../utils/backupService');
const logAction = require('../utils/logger');

// --- UPDATED: getSettings ---
const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // --- Define defaults for all email settings ---
    const defaultSettings = {
        notificationsEnabled: true,
        notificationTime: '08:00',
        dailySalesReportEnabled: false,
        dailySalesReportTime: '08:30'
    };

    // Merge defaults with user's saved settings
    const settings = { ...defaultSettings, ...(user.emailSettings || {}) };
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ message: 'Server Error fetching user settings.' });
  }
};
// --- END UPDATE ---

// --- UPDATED: updateSettings ---
const updateSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!user.emailSettings) {
        user.emailSettings = {};
    }

    // Low stock settings (existing)
    if (req.body.notificationsEnabled !== undefined) {
      user.emailSettings.notificationsEnabled = req.body.notificationsEnabled;
    }
    if (req.body.notificationTime !== undefined) {
      if (typeof req.body.notificationTime !== 'string' || !/^\d{2}:\d{2}$/.test(req.body.notificationTime)) {
          return res.status(400).json({ message: 'Invalid low stock time format. Use HH:MM.' });
      }
      user.emailSettings.notificationTime = req.body.notificationTime;
    }

    // --- NEW: Daily Sales Report settings ---
    if (req.body.dailySalesReportEnabled !== undefined) {
      user.emailSettings.dailySalesReportEnabled = req.body.dailySalesReportEnabled;
    }
    if (req.body.dailySalesReportTime !== undefined) {
      if (typeof req.body.dailySalesReportTime !== 'string' || !/^\d{2}:\d{2}$/.test(req.body.dailySalesReportTime)) {
          return res.status(400).json({ message: 'Invalid daily report time format. Use HH:MM.' });
      }
      user.emailSettings.dailySalesReportTime = req.body.dailySalesReportTime;
    }
    // --- END NEW ---

    const updatedUser = await user.save();
    res.json(updatedUser.emailSettings);
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(400).json({ message: 'Error updating user settings', error: error.message });
  }
};
// --- END UPDATE ---

const getGlobalSetting = async (req, res) => { /* ... unchanged ... */
  try {
    const setting = await Setting.findOne({ key: req.params.key }).lean();
    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }
    res.json(setting);
  } catch (error) {
    console.error(`Error fetching global setting '${req.params.key}':`, error);
    res.status(500).json({ message: 'Server Error fetching global setting.' });
  }
};
const updateGlobalSetting = async (req, res) => { /* ... unchanged ... */
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ message: 'Key and value are required.' });
    }
    const updatedSetting = await Setting.findOneAndUpdate(
      { key: key },
      { value: String(value) },
      { new: true, upsert: true, runValidators: true }
    );
    logAction(req.user, 'UPDATE_APP_SETTINGS', `Updated global setting: '${key}' to '${value}'`, { entityType: 'Setting', entityId: updatedSetting._id });
    res.json(updatedSetting);
  } catch (error) {
    console.error(`Error updating global setting '${req.body.key}':`, error);
    res.status(400).json({ message: 'Error updating setting', error: error.message });
  }
};
const triggerManualBackupToGCS = async (req, res) => { /* ... unchanged ... */
  try {
    console.log(`[${new Date().toLocaleString()}] User ${req.user.username} initiated manual backup to GCS...`);
    const backupFileName = await backupDatabaseToGCS();
    logAction(req.user, 'DATA_BACKUP_GCS_MANUAL', `Performed manual data backup to GCS. Filename: ${backupFileName}`);
    res.status(200).json({ message: `Manual backup successful. File '${backupFileName}' uploaded to Google Cloud Storage.` });
  } catch (error) {
    console.error('Error triggering manual backup to GCS:', error);
    res.status(500).json({ message: 'Server error during manual backup to GCS.', error: error.message });
  }
};
const getBackupSettings = async (req, res) => { /* ... unchanged ... */
  try {
    const [enabledSetting, timeSetting] = await Promise.all([
        Setting.findOne({ key: 'backup_schedule_enabled' }).lean(),
        Setting.findOne({ key: 'backup_schedule_time' }).lean()
    ]);
    res.json({
      enabled: enabledSetting ? enabledSetting.value === 'true' : false,
      time: timeSetting ? timeSetting.value : '02:00',
    });
  } catch (error) {
    console.error('Error fetching backup settings:', error);
    res.status(500).json({ message: 'Server Error fetching backup settings.' });
  }
};
const updateBackupSettings = async (req, res) => { /* ... unchanged ... */
  try {
    const { enabled, time } = req.body;
    if (typeof time !== 'string' || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
      return res.status(400).json({ message: 'Invalid time format. Use HH:MM (24-hour format).' });
    }
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ message: 'Invalid value for enabled. Must be true or false.' });
    }
    await Promise.all([
      Setting.findOneAndUpdate({ key: 'backup_schedule_enabled' }, { value: String(enabled) }, { upsert: true, new: true, runValidators: true }),
      Setting.findOneAndUpdate({ key: 'backup_schedule_time' }, { value: time }, { upsert: true, new: true, runValidators: true })
    ]);
    logAction(req.user, 'UPDATE_APP_SETTINGS', `Updated automated backup settings (Enabled: ${enabled}, Time: ${time})`);
    res.status(200).json({ message: 'Backup settings updated successfully.' });
  } catch (error) {
    console.error('Error updating backup settings:', error);
    res.status(400).json({ message: 'Error updating backup settings', error: error.message });
  }
};
const restoreBackup = async (req, res) => { /* ... unchanged ... */
  const { fileName } = req.body;
  if (!fileName || typeof fileName !== 'string' || !fileName.endsWith('.gz')) {
    return res.status(400).json({ message: 'Invalid or missing backup filename provided.' });
  }
  console.log(`Restore request initiated by ${req.user.username} for GCS file: ${fileName}`);
  let downloadedFilePath = null;
  try {
    logAction(
      req.user,
      'DATA_RESTORE_INITIATED',
      `Initiated database restore from GCS file: ${fileName}. Current data will be overwritten.`,
      { entityType: 'System' }
    );
    downloadedFilePath = await downloadBackupFromGCS(fileName);
    await restoreDatabase(downloadedFilePath);
    console.log(`[${new Date().toLocaleString()}] User ${req.user.username} successfully completed database restore from GCS file ${fileName}.`);
    res.status(200).json({ message: `Database restore from '${fileName}' successful. All data has been overwritten.` });
  } catch (error) {
    console.error(`Restore from GCS failed: ${error.message}`);
    logAction(
      req.user,
      'DATA_RESTORE_FAILED',
      `Failed to restore database from GCS file: ${fileName}. Error: ${error.message}`,
      { entityType: 'System' }
    );
    if (downloadedFilePath && require('fs').existsSync(downloadedFilePath)) {
      try { require('fs').unlinkSync(downloadedFilePath); } catch(e) { console.error('Error during manual cleanup of downloaded restore file:', e);}
    }
    res.status(500).json({ message: error.message || 'An error occurred during the database restore process.' });
  }
};
const listGCSBackups = async (req, res) => { /* ... unchanged ... */
    try {
        const backupFiles = await listBackupsFromGCS();
        res.status(200).json(backupFiles);
    } catch (error) {
        console.error('Error fetching backup list from GCS:', error);
        res.status(500).json({ message: error.message || 'Failed to retrieve backup list.' });
    }
};

module.exports = {
  getSettings,
  updateSettings,
  getGlobalSetting,
  updateGlobalSetting,
  triggerManualBackupToGCS,
  getBackupSettings,
  updateBackupSettings,
  restoreBackup,
  listGCSBackups,
};