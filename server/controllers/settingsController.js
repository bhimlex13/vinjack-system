// server/controllers/settingsController.js
const User = require('../models/userModel');
const Setting = require('../models/settingModel');

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
    
    // Ensure emailSettings exists before assigning
    if (!user.emailSettings) {
        user.emailSettings = {};
    }

    user.emailSettings.notificationsEnabled = req.body.notificationsEnabled;
    user.emailSettings.notificationTime = req.body.notificationTime;
    
    await user.save();
    res.json(user.emailSettings);
  } catch (error) {
    // THIS IS THE NEW, DETAILED LOGGING
    console.error('Error updating settings:', error); // Log the full error to the terminal
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

module.exports = { getSettings, updateSettings, getGlobalSetting, updateGlobalSetting };
