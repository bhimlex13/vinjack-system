// server/controllers/reportController.js
const Sale = require('../models/saleModel');
const Product = require('../models/productModel');
const PurchaseOrder = require('../models/purchaseOrderModel'); // --- ADDED

// @desc    Get dashboard summary statistics
// @route   GET /api/reports/summary
const getDashboardSummary = async (req, res) => {
  try {
    const { range } = req.query;
    const dateFilter = {};
    const now = new Date();

    // Set the start date based on the selected range
    switch (range) {
      case 'today':
        const today = new Date(now.setHours(0, 0, 0, 0));
        dateFilter.createdAt = { $gte: today };
        break;
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        dateFilter.createdAt = { $gte: startOfWeek };
        break;
      case 'month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter.createdAt = { $gte: startOfMonth };
        break;
      default:
        // 'all' or no range provided, dateFilter remains empty to fetch all data
        break;
    }

    // 1. Calculate Total Revenue and Sales in parallel with Total COGS
    const [salesData, cogsData] = await Promise.all([
      // Aggregation for Revenue and Sales Count
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
      // Aggregation for Total Cost of Goods Sold (COGS)
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

    // Calculate profit
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

    // --- CHANGE START ---
    // Create a date object from the endDate string
    const endOfDay = new Date(endDate);
    // Set the date to the next day to include the entire endDate
    endOfDay.setDate(endOfDay.getDate() + 1);
    // --- CHANGE END ---

    const sales = await Sale.find({
      createdAt: {
        $gte: new Date(startDate),
        $lt: endOfDay, // Use $lt (less than) the start of the next day
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

// @desc    Get sales trend data for the last 30 days
// @route   GET /api/reports/sales-trend
const getSalesTrend = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesTrend = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalSales: { $sum: '$totalAmount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    res.json(salesTrend);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get the 5 most recent transactions
// @route   GET /api/reports/recent-transactions
const getRecentTransactions = async (req, res) => {
  try {
    const recentSales = await Sale.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('recordedBy', 'fullName');

    res.json(recentSales);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// --- ADDED START ---
// @desc    Get pending purchase orders
// @route   GET /api/reports/pending-pos
const getPendingPurchaseOrders = async (req, res) => {
  try {
    const pendingPOs = await PurchaseOrder.find({
      status: { $in: ['Pending', 'Approved', 'Partially Received'] }
    })
    .sort({ orderDate: 'asc' }) // Show oldest first
    .limit(5)
    .populate('supplier', 'name');

    res.json(pendingPOs);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
// --- ADDED END ---


module.exports = { getDashboardSummary, getSalesReport, getLowStockProducts, getSalesTrend, getRecentTransactions, getPendingPurchaseOrders }; // <-- Added getPendingPurchaseOrders