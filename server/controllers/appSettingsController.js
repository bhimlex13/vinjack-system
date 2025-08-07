// server/controllers/appSettingsController.js
const Setting = require('../models/settingModel');

// @desc    Get a specific setting by key
const getSetting = async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: req.params.key });
    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create or update a setting
const updateSetting = async (req, res) => {
  try {
    const { key, value } = req.body;
    // Find the setting by key and update it, or create it if it doesn't exist
    const updatedSetting = await Setting.findOneAndUpdate(
      { key: key },
      { value: value },
      { new: true, upsert: true } // upsert: true creates the doc if it doesn't exist
    );
    res.json(updatedSetting);
  } catch (error) {
    res.status(400).json({ message: 'Error updating setting' });
  }
};

module.exports = { getSetting, updateSetting };