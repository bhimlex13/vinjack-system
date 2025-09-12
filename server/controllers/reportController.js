// server/controllers/reportController.js
const Sale = require('../models/saleModel');
const Product = require('../models/productModel');
const PurchaseOrder = require('../models/purchaseOrderModel');

// --- NEW HELPER FUNCTION ---
// Helper to create a date filter object based on the time range query
const createDateFilter = (range) => {
  const dateFilter = {};
  const now = new Date();

  switch (range) {
    case 'today':
      // Start of today
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateFilter.createdAt = { $gte: today };
      break;
    case 'week':
      // Start of the current week (assuming Sunday is the first day)
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      dateFilter.createdAt = { $gte: startOfWeek };
      break;
    case 'month':
      // Start of the current month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter.createdAt = { $gte: startOfMonth };
      break;
    default:
      // 'all' or no range provided, dateFilter remains empty
      break;
  }
  return dateFilter;
};
// --- END HELPER FUNCTION ---


// @desc    Get dashboard summary statistics
// @route   GET /api/reports/summary
const getDashboardSummary = async (req, res) => {
  try {
    const { range } = req.query;
    // --- CHANGE: Use helper function for consistency ---
    const dateFilter = createDateFilter(range);

    // 1. Calculate Total Revenue and Sales in parallel with Total COGS
    const [salesData, cogsData] = await Promise.all([
      Sale.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalSales: { $sum: 1 }
          }
        }
      ]),
      Sale.aggregate([
        { $match: dateFilter },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        { $unwind: '$productInfo' },
        {
          $group: {
            _id: null,
            totalCOGS: { $sum: { $multiply: ['$items.quantity', '$productInfo.cost'] } }
          }
        }
      ])
    ]);

    const totalRevenue = salesData[0]?.totalRevenue || 0;
    const totalCOGS = cogsData[0]?.totalCOGS || 0;
    const totalProfit = totalRevenue - totalCOGS;

    // 2. Product stats are not time-sensitive
    const productStats = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$quantity' }
        }
      }
    ]);

    // 3. Top selling products, applying the date filter
    const topSellingProducts = await Sale.aggregate([
      { $match: dateFilter },
      { $unwind: '$items' },
      { 
        $group: {
            _id: '$items.product',
            totalQuantitySold: { $sum: '$items.quantity' }
        }
      },
      { $sort: { totalQuantitySold: -1 } },
      { $limit: 5 },
      { 
        $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' }
    ]);
    
    res.json({
      totalRevenue: totalRevenue,
      totalProfit: totalProfit,
      totalSales: salesData[0]?.totalSales || 0,
      totalProducts: productStats[0]?.totalProducts || 0,
      totalStock: productStats[0]?.totalStock || 0,
      topSellingProducts
    });

  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get a sales report for a given date range
// @route   GET /api/reports/sales
const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Please provide a start and end date.' });
    }

    const endOfDay = new Date(endDate);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const sales = await Sale.find({
      createdAt: {
        $gte: new Date(startDate),
        $lt: endOfDay,
      },
    })
    .sort({ createdAt: -1 })
    .populate('recordedBy', 'fullName')
    .populate('items.product', 'name');
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get products that are low in stock
// @route   GET /api/reports/low-stock
const getLowStockProducts = async (req, res) => {
  try {
    const lowStockProducts = await Product.find({
      reorderLevel: { $gt: 0 },
      $expr: { $lte: ["$quantity", "$reorderLevel"] }
    })
    .sort({ quantity: 'asc' })
    .limit(10);

    res.json(lowStockProducts);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// --- MODIFIED FUNCTION START ---
// @desc    Get sales trend data
// @route   GET /api/reports/sales-trend
const getSalesTrend = async (req, res) => {
  try {
    const { range } = req.query;
    let dateFilter = {};
    let groupByFormat = "%Y-%m-%d"; // Group by day by default
    const now = new Date();

    if (range === 'all' || !range) {
      // For "all time", group by month to make the chart readable
      groupByFormat = "%Y-%m";
    } else {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        // Default to last 30 days if no specific range is matched below
        dateFilter = { createdAt: { $gte: thirtyDaysAgo } };
    }
  
    // Specific time ranges override the default
    switch (range) {
      case 'today':
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateFilter = { createdAt: { $gte: todayStart } };
        groupByFormat = "%Y-%m-%d %H:00"; // Group by hour for today's view
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        dateFilter = { createdAt: { $gte: weekStart } };
        groupByFormat = "%Y-%m-%d";
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { createdAt: { $gte: monthStart } };
        groupByFormat = "%Y-%m-%d";
        break;
    }

    const salesTrend = await Sale.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: groupByFormat, date: "$createdAt", timezone: "Asia/Manila" } },
          totalSales: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    res.json(salesTrend);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
// --- MODIFIED FUNCTION END ---


// --- MODIFIED FUNCTION START ---
// @desc    Get the most recent transactions based on a time range
// @route   GET /api/reports/recent-transactions
const getRecentTransactions = async (req, res) => {
  try {
    const { range } = req.query;
    const dateFilter = createDateFilter(range); // Use the helper

    const recentSales = await Sale.find(dateFilter) // Apply filter
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('recordedBy', 'fullName');

    res.json(recentSales);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
// --- MODIFIED FUNCTION END ---

// @desc    Get pending purchase orders
// @route   GET /api/reports/pending-pos
const getPendingPurchaseOrders = async (req, res) => {
  try {
    const pendingPOs = await PurchaseOrder.find({
      status: { $in: ['Pending', 'Approved', 'Partially Received'] }
    })
    .sort({ orderDate: 'asc' })
    .limit(5)
    .populate('supplier', 'name');

    res.json(pendingPOs);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};


module.exports = { getDashboardSummary, getSalesReport, getLowStockProducts, getSalesTrend, getRecentTransactions, getPendingPurchaseOrders };