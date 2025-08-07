// server/jobs/cronJobs.js
const cron = require('node-cron');
const Product = require('../models/productModel');
const { sendLowStockEmail } = require('../utils/emailService');

// Schedule a job to run every day at 8:00 AM
const startLowStockCheck = () => {
  // The cron string '0 8 * * *' means "at 0 minutes past the 8th hour, every day"
  cron.schedule('0 8 * * *', async () => {
    console.log('Running daily low stock check...');
    try {
      const lowStockItems = await Product.find({
        $expr: { $lte: ['$quantity', '$reorderLevel'] }
      });

      if (lowStockItems.length > 0) {
        await sendLowStockEmail(lowStockItems);
      } else {
        console.log('All stock levels are healthy.');
      }
    } catch (error) {
      console.error('Error during daily low stock check:', error);
    }
  }, {
    timezone: "Asia/Manila" // Set to your local timezone
  });

  console.log('Daily low stock check job scheduled.');
};

module.exports = startLowStockCheck;