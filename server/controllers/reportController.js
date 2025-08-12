// server/controllers/reportController.js
const Sale = require('../models/saleModel');
const Product = require('../models/productModel');

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

    // 1. Get total revenue and sales, applying the date filter
    const salesData = await Sale.aggregate([
      { $match: dateFilter }, // MODIFIED: Filter by date range first
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalSales: { $sum: 1 }
        }
      }
    ]);

    // 2. Product stats are not time-sensitive, so no filter is applied
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
      { $match: dateFilter }, // MODIFIED: Filter by date range first
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
      totalRevenue: salesData[0]?.totalRevenue || 0,
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

    const sales = await Sale.find({
      createdAt: {
        $gte: new Date(startDate), // Greater than or equal to start date
        $lte: new Date(endDate),   // Less than or equal to end date
      },
    })
    .sort({ createdAt: -1 }) // Show most recent first
    .populate('recordedBy', 'fullName') // Get the full name of the user who recorded it
    .populate('items.product', 'name'); // Get the name of each product sold

    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { getDashboardSummary, getSalesReport };