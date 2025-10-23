// server/jobs/cronJobs.js
const cron = require('node-cron');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const Setting = require('../models/settingModel'); // Import Setting model
const { sendLowStockEmail } = require('../utils/emailService');
const { backupDatabaseToGCS } = require('../utils/backupService'); // Import the GCS backup function

const startScheduledJobs = () => {

  // --- Low Stock Check Job (runs every minute for dynamic time matching) ---
  cron.schedule('* * * * *', async () => {
    // ... (rest of low stock logic remains the same) ...
    const now = new Date();
    const timeInZone = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const currentHour = timeInZone.getHours().toString().padStart(2, '0');
    const currentMinute = timeInZone.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    try {
        const usersToNotify = await User.find({
            'emailSettings.notificationsEnabled': true,
            'emailSettings.notificationTime': currentTime
        }).lean();
        if (usersToNotify.length > 0) {
            // console.log(`[${timeInZone.toLocaleString()}] Notification time matched for ${usersToNotify.length} user(s). Checking stock...`);
            const lowStockItems = await Product.find({
                $expr: { $lte: ['$quantity', '$reorderLevel'] }
            }).select('name quantity reorderLevel').lean();

            if (lowStockItems.length > 0) {
                for (const user of usersToNotify) {
                    if (user.email) {
                        console.log(`[${timeInZone.toLocaleString()}] Sending low stock alert to ${user.email}...`);
                        sendLowStockEmail(lowStockItems, user.email).catch(emailError => {
                           console.error(`[${timeInZone.toLocaleString()}] Failed to send low stock email to ${user.email}:`, emailError);
                        });
                    } else {
                        console.log(`[${timeInZone.toLocaleString()}] User ${user.username} has notifications enabled but no email address.`);
                    }
                }
            } else {
                // console.log(`[${timeInZone.toLocaleString()}] All stock levels are healthy. No email needed.`);
            }
        }
    } catch (error) {
        console.error(`[${timeInZone.toLocaleString()}] Error during scheduled stock check:`, error);
    }
  });
  console.log('Dynamic low stock check job scheduled.');


  // --- MODIFIED: Database Backup Job - Checks DB settings every minute ---
  cron.schedule('* * * * *', async () => { // Changed from '*/5 * * * *' to run every minute
    const now = new Date();
    const timeInZone = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const currentHour = timeInZone.getHours().toString().padStart(2, '0');
    const currentMinute = timeInZone.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`; // Format: HH:MM

    try {
      // Fetch backup settings from the database
      const enabledSetting = await Setting.findOne({ key: 'backup_schedule_enabled' }).lean();
      const timeSetting = await Setting.findOne({ key: 'backup_schedule_time' }).lean();

      const isEnabled = enabledSetting ? enabledSetting.value === 'true' : false; // Default false
      const scheduledTime = timeSetting ? timeSetting.value : '02:00'; // Default 02:00

      // Check if enabled and if the current time matches the scheduled time
      if (isEnabled && currentTime === scheduledTime) {
        console.log(`[${timeInZone.toLocaleString()}] Matched backup schedule (${scheduledTime}). Running backup to GCS...`);
        // Run backup
        backupDatabaseToGCS().catch(backupError => {
          console.error(`[${timeInZone.toLocaleString()}] Scheduled GCS backup failed:`, backupError);
        });
      }
      // No need for an else log here, it would spam the console every minute

    } catch (error) {
      console.error(`[${timeInZone.toLocaleString()}] Error checking/running scheduled backup:`, error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Manila"
  });
  // Update log message
  console.log('Scheduled backup checker running every minute (Manila time).');
  // --- END MODIFICATION ---

};

module.exports = { startScheduledJobs };