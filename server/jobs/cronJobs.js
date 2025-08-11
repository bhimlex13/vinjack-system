// server/jobs/cronJobs.js
const cron = require('node-cron');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const { sendLowStockEmail } = require('../utils/emailService');

const startLowStockCheck = () => {
  // This job runs every minute to check if it's time to send an alert
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const timeInZone = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const currentHour = timeInZone.getHours().toString().padStart(2, '0');
    const currentMinute = timeInZone.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    try {
      // 1. Find any users who have scheduled a notification for this exact time
      const usersToNotify = await User.find({
        'emailSettings.notificationsEnabled': true,
        'emailSettings.notificationTime': currentTime
      });

      if (usersToNotify.length === 0) {
        return; // No one to notify at this time
      }
      
      console.log(`Notification time matched for ${usersToNotify.length} user(s). Preparing alert...`);

      // 2. Find low stock items
      const lowStockItems = await Product.find({
        $expr: { $lte: ['$quantity', '$reorderLevel'] }
      });

      if (lowStockItems.length === 0) {
        console.log('All stock levels are healthy. No email will be sent.');
        return;
      }

      // 3. Send an email to each user who wants to be notified
      for (const user of usersToNotify) {
        if (user.email) {
          console.log(`Sending alert to ${user.email}...`);
          await sendLowStockEmail(lowStockItems, user.email);
        } else {
          console.log(`User ${user.username} has notifications enabled but no email address is set.`);
        }
      }

    } catch (error) {
      console.error('Error during scheduled stock check:', error);
    }
  });

  console.log('Dynamic low stock check job scheduled to run every minute.');
};

module.exports = startLowStockCheck;
