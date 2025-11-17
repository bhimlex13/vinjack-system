// server/jobs/cronJobs.js
const cron = require('node-cron');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const Setting = require('../models/settingModel');
const Sale = require('../models/saleModel');
const { sendLowStockEmail, sendDailySalesReport } = require('../utils/emailService');
const { backupDatabaseToGCS } = require('../utils/backupService');
// --- REMOVED all date-fns and date-fns-tz imports ---

// --- UPDATED: generateTodaySalesData helper (uses native Date methods) ---
const generateTodaySalesData = async (timezone) => {
  try {
    // 1. Get date range for "today" in the specified timezone using your working method
    const now = new Date();
    const nowInManila = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    
    // Create start of day in native JS
    const todayStart = new Date(nowInManila.setHours(0, 0, 0, 0));
    
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    
    const saleDateFilter = { createdAt: { $gte: todayStart, $lt: tomorrowStart } };

    // 2. Perform aggregations (unchanged)
    const [salesProfitQtyData, topSellingProducts] = await Promise.all([
      // Aggregation for Revenue, COGS, Sales Count & Quantity Sold
      Sale.aggregate([
        { $match: saleDateFilter },
        { $unwind: '$items' },
        {
          $group: {
            _id: null,
            totalRevenue: { $addToSet: { saleId: '$_id', amount: '$totalAmount' } },
            totalCOGS: { $sum: { $multiply: ['$items.quantity', { $ifNull: ['$items.costOfGoodsSold', 0] }] } },
            totalQuantitySold: { $sum: '$items.quantity' },
          }
        },
        {
          $project: {
            _id: 0,
            totalRevenue: { $sum: '$totalRevenue.amount' },
            totalCOGS: { $ifNull: ['$totalCOGS', 0] },
            totalSales: { $size: { $ifNull: ['$totalRevenue', []] } },
            totalQuantitySold: { $ifNull: ['$totalQuantitySold', 0] }
          }
        }
      ]),
      // Top Selling Products
      Sale.aggregate([
          { $match: saleDateFilter },
          { $unwind: '$items' },
          { $group: { _id: '$items.product', totalQuantitySold: { $sum: '$items.quantity' } } },
          { $sort: { totalQuantitySold: -1 } },
          { $limit: 5 },
          { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productInfo' } },
          { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
          { $project: { _id: 1, totalQuantitySold: 1, productInfo: { _id: '$_id', name: { $ifNull: ['$productInfo.name', 'Deleted Product'] } } } }
      ])
    ]);

    // 3. Format the data (unchanged)
    const salesResult = salesProfitQtyData[0] || {};
    const totalRevenue = salesResult.totalRevenue || 0;
    const totalCOGS = salesResult.totalCOGS || 0;
    const totalProfit = totalRevenue - totalCOGS;

    return {
      totalRevenue,
      totalProfit,
      totalSales: salesResult.totalSales || 0,
      totalItemsSold: salesResult.totalQuantitySold || 0,
      topSellingProducts: topSellingProducts || []
    };

  } catch (error) {
    console.error('Error generating today\'s sales data:', error);
    return null; // Return null on error
  }
};
// --- END UPDATED HELPER ---


const startScheduledJobs = () => {
  const timezone = 'Asia/Manila';

  // --- Low Stock/Sales Report Check Job (runs every minute) ---
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    
    // --- REVERTED: Use your original working method for time ---
    const timeInZone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const currentHour = timeInZone.getHours().toString().padStart(2, '0');
    const currentMinute = timeInZone.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    // --- END REVERT ---

    // --- REVERTED: Use native JS for date string ---
    const reportDateStr = timeInZone.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    try {
        // Find users for BOTH jobs at the same time
        const usersToNotify = await User.find({
            $or: [
                { 'emailSettings.notificationsEnabled': true, 'emailSettings.notificationTime': currentTime },
                { 'emailSettings.dailySalesReportEnabled': true, 'emailSettings.dailySalesReportTime': currentTime }
            ]
        }).lean();

        if (usersToNotify.length === 0) return;

        // --- Check Low Stock (if needed) ---
        const usersForLowStock = usersToNotify.filter(u => u.emailSettings.notificationsEnabled && u.emailSettings.notificationTime === currentTime);
        if (usersForLowStock.length > 0) {
            const lowStockItems = await Product.find({
                $expr: { $lte: ['$quantity', '$reorderLevel'] }
            }).select('name quantity reorderLevel').lean();

            if (lowStockItems.length > 0) {
                for (const user of usersForLowStock) {
                    if (user.email) {
                        console.log(`[${timeInZone.toLocaleString()}] Sending low stock alert to ${user.email}...`);
                        sendLowStockEmail(lowStockItems, user.email).catch(emailError => {
                           console.error(`[${timeInZone.toLocaleString()}] Failed to send low stock email to ${user.email}:`, emailError);
                        });
                    }
                }
            }
        }

        // --- Check Daily Sales (if needed) ---
        const usersForSalesReport = usersToNotify.filter(u => u.emailSettings.dailySalesReportEnabled && u.emailSettings.dailySalesReportTime === currentTime);
        if (usersForSalesReport.length > 0) {
            console.log(`[${timeInZone.toLocaleString()}] Matched daily sales report time for ${usersForSalesReport.length} user(s). Generating data...`);
            
            const reportData = await generateTodaySalesData(timezone);

            if (reportData) {
                if (reportData.totalSales > 0) {
                    for (const user of usersForSalesReport) {
                        if (user.email) {
                            console.log(`[${timeInZone.toLocaleString()}] Sending daily sales report to ${user.email}...`);
                            sendDailySalesReport({ reportData, recipientEmail: user.email, reportDateStr }).catch(emailError => {
                               console.error(`[${timeInZone.toLocaleString()}] Failed to send sales report to ${user.email}:`, emailError);
                            });
                        }
                    }
                } else {
                     console.log(`[${timeInZone.toLocaleString()}] No sales recorded today. Skipping email for daily report.`);
                }
            } else {
                 console.error(`[${timeInZone.toLocaleString()}] Failed to generate sales report data. No emails sent.`);
            }
        }
    } catch (error) {
        console.error(`[${timeInZone.toLocaleString()}] Error during scheduled email job:`, error);
    }
  });
  console.log('Dynamic email notification job scheduled.');


  // --- Database Backup Job (runs every minute) ---
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    
    // --- REVERTED: Use your original working method for time ---
    const timeInZone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const currentHour = timeInZone.getHours().toString().padStart(2, '0');
    const currentMinute = timeInZone.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    // --- END REVERT ---

    try {
      const enabledSetting = await Setting.findOne({ key: 'backup_schedule_enabled' }).lean();
      const timeSetting = await Setting.findOne({ key: 'backup_schedule_time' }).lean();
      const isEnabled = enabledSetting ? enabledSetting.value === 'true' : false;
      const scheduledTime = timeSetting ? timeSetting.value : '02:00';

      if (isEnabled && currentTime === scheduledTime) {
        console.log(`[${timeInZone.toLocaleString()}] Matched backup schedule (${scheduledTime}). Running backup to GCS...`);
        backupDatabaseToGCS().catch(backupError => {
          console.error(`[${timeInZone.toLocaleString()}] Scheduled GCS backup failed:`, backupError);
        });
      }
    } catch (error) {
      console.error(`[${timeInZone.toLocaleString()}] Error checking/running scheduled backup:`, error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Manila"
  });
  console.log('Scheduled backup checker running every minute (Manila time).');

};

module.exports = { startScheduledJobs };