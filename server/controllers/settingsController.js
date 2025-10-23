// server/controllers/settingsController.js
const User = require('../models/userModel');
const Setting = require('../models/settingModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Brand = require('../models/brandModel');
const Supplier = require('../models/supplierModel');
const Sale = require('../models/saleModel');
const Service = require('../models/serviceModel');
const Motorcycle = require('../models/motorcycleModel');
const Customer = require('../models/customerModel');
const Delivery = require('../models/deliveryModel');
const PurchaseOrder = require('../models/purchaseOrderModel');
const Return = require('../models/returnModel');
const Movement = require('../models/movementModel');
const AuditLog = require('../models/auditLogModel');
const Notification = require('../models/notificationModel');
// Add any other models you want to back up if necessary
const logAction = require('../utils/logger'); // Import logger

// --- User-Specific Notification Settings ---
const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean(); // Use lean for read-only
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Ensure emailSettings exists before sending, provide defaults
    const settings = user.emailSettings || { notificationsEnabled: true, notificationTime: '08:00' };
    res.json(settings);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ message: 'Server Error fetching user settings.' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize emailSettings if it doesn't exist
    if (!user.emailSettings) {
        user.emailSettings = {};
    }

    // Update fields carefully, checking for undefined to allow partial updates
    if (req.body.notificationsEnabled !== undefined) {
      user.emailSettings.notificationsEnabled = req.body.notificationsEnabled;
    }
    if (req.body.notificationTime !== undefined) {
      // Basic time format validation
      if (typeof req.body.notificationTime !== 'string' || !/^\d{2}:\d{2}$/.test(req.body.notificationTime)) {
          return res.status(400).json({ message: 'Invalid notification time format. Use HH:MM.' });
      }
      user.emailSettings.notificationTime = req.body.notificationTime;
    }

    const updatedUser = await user.save();
    res.json(updatedUser.emailSettings);
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(400).json({ message: 'Error updating user settings', error: error.message });
  }
};


// --- Individual Global App Settings (Legacy/Specific Use) ---
const getGlobalSetting = async (req, res) => {
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

const updateGlobalSetting = async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ message: 'Key and value are required.' });
    }
    const updatedSetting = await Setting.findOneAndUpdate(
      { key: key },
      { value: String(value) }, // Ensure value is stored as string
      { new: true, upsert: true, runValidators: true }
    );
    // Log the action
    logAction(req.user, 'UPDATE_APP_SETTINGS', `Updated global setting: '${key}' to '${value}'`, { entityType: 'Setting', entityId: updatedSetting._id });
    res.json(updatedSetting);
  } catch (error) {
    console.error(`Error updating global setting '${req.body.key}':`, error);
    res.status(400).json({ message: 'Error updating setting', error: error.message });
  }
};


// --- Manual Backup Download Function ---
const createBackup = async (req, res) => {
  try {
    console.log(`[${new Date().toLocaleString()}] User ${req.user.username} initiated manual backup process...`);

    // Define collections to back up
    // Ensure all relevant models are imported at the top
    const collectionsToBackup = {
      users: User,
      products: Product,
      categories: Category,
      brands: Brand,
      suppliers: Supplier,
      sales: Sale,
      services: Service,
      motorcycles: Motorcycle,
      customers: Customer,
      deliveries: Delivery,
      purchaseorders: PurchaseOrder,
      returns: Return,
      movements: Movement,
      auditlogs: AuditLog,
      notifications: Notification,
      settings: Setting, // Include global settings in backup
    };

    const backupData = {};

    // Fetch data for each collection
    for (const [key, model] of Object.entries(collectionsToBackup)) {
      if (model && typeof model.find === 'function') { // Check if it's a valid Mongoose model
        console.log(`Backing up collection: ${key}`);
        backupData[key] = await model.find({}).lean(); // Use .lean() for plain JS objects
      } else {
        console.warn(`Model not found or invalid for collection key: '${key}'. Skipping.`);
      }
    }

    console.log('Manual backup data fetching complete.');

    // Set headers for file download
    const dateStamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    const fileName = `vinjack-manual-backup-${dateStamp}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`); // Ensure filename is quoted
    res.setHeader('Content-Type', 'application/json');

    // Send the data as JSON stream for potentially large backups
    res.status(200).json(backupData);
    console.log(`Manual backup file ${fileName} sent successfully.`);

    // Log manual backup action
    logAction(req.user, 'DATA_EXPORT', `Performed manual data backup. Filename: ${fileName}`);

  } catch (error) {
    console.error('Error creating manual backup:', error);
    res.status(500).json({ message: 'Server error during manual backup.', error: error.message });
  }
};


// --- NEW: Backup Schedule Configuration Functions ---
const getBackupSettings = async (req, res) => {
  try {
    // Fetch settings concurrently
    const [enabledSetting, timeSetting] = await Promise.all([
        Setting.findOne({ key: 'backup_schedule_enabled' }).lean(),
        Setting.findOne({ key: 'backup_schedule_time' }).lean()
    ]);

    res.json({
      enabled: enabledSetting ? enabledSetting.value === 'true' : false, // Default to false
      time: timeSetting ? timeSetting.value : '02:00', // Default to 02:00
    });
  } catch (error) {
    console.error('Error fetching backup settings:', error);
    res.status(500).json({ message: 'Server Error fetching backup settings.' });
  }
};

const updateBackupSettings = async (req, res) => {
  try {
    const { enabled, time } = req.body;

    // Validate time format (HH:MM - 24 hour)
    if (typeof time !== 'string' || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
      return res.status(400).json({ message: 'Invalid time format. Use HH:MM (24-hour format).' });
    }
    // Validate enabled format
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ message: 'Invalid value for enabled. Must be true or false.' });
    }

    // Update or create settings using Promise.all
    await Promise.all([
      Setting.findOneAndUpdate(
        { key: 'backup_schedule_enabled' },
        { value: String(enabled) }, // Store boolean as string "true" or "false"
        { upsert: true, new: true, runValidators: true } // Added new: true for consistency
      ),
      Setting.findOneAndUpdate(
        { key: 'backup_schedule_time' },
        { value: time },
        { upsert: true, new: true, runValidators: true }
      )
    ]);

    logAction(req.user, 'UPDATE_APP_SETTINGS', `Updated automated backup settings (Enabled: ${enabled}, Time: ${time})`);
    res.status(200).json({ message: 'Backup settings updated successfully.' });

  } catch (error) {
    console.error('Error updating backup settings:', error);
    res.status(400).json({ message: 'Error updating backup settings', error: error.message });
  }
};
// --- END NEW ---


module.exports = {
  getSettings,          // User notification settings
  updateSettings,       // User notification settings
  getGlobalSetting,     // Individual global setting (legacy)
  updateGlobalSetting,  // Individual global setting (legacy)
  createBackup,         // Manual backup download
  // --- NEW: Export backup config functions ---
  getBackupSettings,
  updateBackupSettings
};