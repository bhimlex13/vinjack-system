// server/controllers/settingsController.js
const User = require('../models/userModel');
const Setting = require('../models/settingModel'); // Assuming you have this
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
const Return = require('../models/returnModel'); // Assuming you have this
const Movement = require('../models/movementModel');
const AuditLog = require('../models/auditLogModel');
const Notification = require('../models/notificationModel');
// Add any other models you want to back up

// --- User-Specific Settings ---
const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.emailSettings);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (!user.emailSettings) {
        user.emailSettings = {};
    }

    user.emailSettings.notificationsEnabled = req.body.notificationsEnabled;
    user.emailSettings.notificationTime = req.body.notificationTime;
    
    await user.save();
    res.json(user.emailSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(400).json({ message: 'Error updating settings', error: error.message });
  }
};

// --- Global App Settings ---
const getGlobalSetting = async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: req.params.key });
    if (!setting) return res.status(404).json({ message: 'Setting not found' });
    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const updateGlobalSetting = async (req, res) => {
  try {
    const { key, value } = req.body;
    const updatedSetting = await Setting.findOneAndUpdate(
      { key: key },
      { value: value },
      { new: true, upsert: true }
    );
    res.json(updatedSetting);
  } catch (error) {
    res.status(400).json({ message: 'Error updating setting' });
  }
};

// --- NEW: Backup Function ---
const createBackup = async (req, res) => {
  try {
    console.log('Starting manual backup process...'); // Log start

    // Define collections to back up
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
      settings: Setting, // Global settings
      // Add other models here
    };

    const backupData = {};

    // Fetch data for each collection
    for (const [key, model] of Object.entries(collectionsToBackup)) {
      if (model) { // Check if the model exists
        console.log(`Backing up collection: ${key}`); // Log collection name
        backupData[key] = await model.find({}).lean(); // Use .lean() for plain JS objects
      } else {
        console.warn(`Model not found for collection: ${key}. Skipping.`); // Warn if model is missing
      }
    }
    
    console.log('Backup data fetching complete.'); // Log completion

    // Set headers for file download
    const dateStamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    const fileName = `vinjack-backup-${dateStamp}.json`;
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-Type', 'application/json');

    // Send the data as JSON
    res.status(200).json(backupData);
    console.log(`Backup file ${fileName} sent successfully.`); // Log success

  } catch (error) {
    console.error('Error creating backup:', error); // Log the full error
    res.status(500).json({ message: 'Server error during backup.', error: error.message });
  }
};
// --- END NEW ---


module.exports = {
  getSettings,
  updateSettings,
  getGlobalSetting,
  updateGlobalSetting,
  // --- NEW: Export the backup function ---
  createBackup
};