// server/controllers/reportController.js
const Sale = require('../models/saleModel');
const Product = require('../models/productModel');
const PurchaseOrder = require('../models/purchaseOrderModel');

// Helper to create a date filter object based on the time range query
const createDateFilter = (range) => {
  const dateFilter = {};
  const now = new Date();

  switch (range) {
    case 'today':
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
      break;
  }
  return dateFilter;
};


// @desc    Get dashboard summary statistics
// @route   GET /api/reports/summary
const getDashboardSummary = async (req, res) => {
  try {
    const { range } = req.query;
    const dateFilter = createDateFilter(range);

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

    const productStats = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$quantity' }
        }
      }
    ]);

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
    // --- THIS IS THE FIX: Read new filters from query ---
    const { startDate, endDate, customerId, userId } = req.query;
    
    const filter = {};

    // Build date filter
    if (startDate && endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setDate(endOfDay.getDate() + 1);
        filter.createdAt = { $gte: new Date(startDate), $lt: endOfDay };
    } else {
        return res.status(400).json({ message: 'Please provide a start and end date.' });
    }

    // Add customer and user filters if they exist
    if (customerId) {
        filter.customer = customerId;
    }
    if (userId) {
        filter.recordedBy = userId;
    }

    const sales = await Sale.find(filter) // Use the dynamic filter object
      .sort({ createdAt: -1 })
      .populate('recordedBy', 'fullName')
      .populate('items.product', 'name')
      .populate('customer', 'name');
    
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

// @desc    Get sales trend data
// @route   GET /api/reports/sales-trend
const getSalesTrend = async (req, res) => {
  try {
    const { range } = req.query;
    let dateFilter = {};
    let groupByFormat = "%Y-%m-%d";
    const now = new Date();

    if (range === 'all' || !range) {
      groupByFormat = "%Y-%m";
    } else {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        dateFilter = { createdAt: { $gte: thirtyDaysAgo } };
    }
  
    switch (range) {
      case 'today':
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateFilter = { createdAt: { $gte: todayStart } };
        groupByFormat = "%Y-%m-%d %H:00";
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

// @desc    Get the most recent transactions based on a time range
// @route   GET /api/reports/recent-transactions
const getRecentTransactions = async (req, res) => {
  try {
    const { range } = req.query;
    const dateFilter = createDateFilter(range);

    const recentSales = await Sale.find(dateFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('recordedBy', 'fullName');

    res.json(recentSales);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

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