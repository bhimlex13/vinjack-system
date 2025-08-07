// server/jobs/cronJobs.js
const cron = require('node-cron');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const Setting = require('../models/settingModel');
const { sendLowStockEmail } = require('../utils/emailService');

const startLowStockCheck = () => {
  // This job runs every minute to check if it's time to send the daily alert
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const timeInZone = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const currentHour = timeInZone.getHours().toString().padStart(2, '0');
    const currentMinute = timeInZone.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    try {
      // 1. Check if any user has scheduled a notification for this exact time
      const usersToNotify = await User.find({
        'emailSettings.notificationsEnabled': true,
        'emailSettings.notificationTime': currentTime
      });

      // If no user has this time set, do nothing.
      if (usersToNotify.length === 0) {
        return;
      }
      
      console.log(`Notification time matched for ${usersToNotify.length} user(s) at ${currentTime}. Preparing to send alert.`);

      // 2. Get the single, global email address from App Settings
      const emailSetting = await Setting.findOne({ key: 'notificationEmail' });
      if (!emailSetting || !emailSetting.value) {
        console.log('Global notification email not set. Cannot send alert.');
        return;
      }
      const recipientEmail = emailSetting.value;

      // 3. Find low stock items
      const lowStockItems = await Product.find({
        $expr: { $lte: ['$quantity', '$reorderLevel'] }
      });

      if (lowStockItems.length === 0) {
        console.log('All stock levels are healthy. No email will be sent.');
        return;
      }

      // 4. Send one email to the globally configured address
      console.log(`Found low stock items. Sending one alert to ${recipientEmail}...`);
      await sendLowStockEmail(lowStockItems, recipientEmail);

    } catch (error) {
      console.error('Error during scheduled stock check:', error);
    }
  });

  console.log('Dynamic low stock check job scheduled to run every minute.');
};

module.exports = startLowStockCheck;