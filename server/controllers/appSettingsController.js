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

    // --- *** THIS IS THE REAL FIX *** ---
    // We must manually check for 'value' because findOneAndUpdate
    // with 'upsert' does not trigger 'required' validators for
    // fields that are 'undefined' in the update object.
    if (value === undefined) {
      return res.status(400).json({ message: 'Error updating setting' });
    }
    // --- *** END FIX *** ---

    const updatedSetting = await Setting.findOneAndUpdate(
      { key: key },
      { value: value },
      // runValidators is still good practice for other rules
      { new: true, upsert: true, runValidators: true } 
    );
    res.json(updatedSetting);
  } catch (error) {
    // This will now catch other errors (like a missing 'key')
    res.status(400).json({ message: 'Error updating setting' });
  }
};

module.exports = { getSetting, updateSetting };