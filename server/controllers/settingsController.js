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
    user.emailSettings = req.body;
    await user.save();
    res.json(user.emailSettings);
  } catch (error) {
    res.status(400).json({ message: 'Error updating settings' });
  }
};

// --- Global App Settings (Moved from appSettingsController) ---
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