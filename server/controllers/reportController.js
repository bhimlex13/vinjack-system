// server/controllers/reportController.js
const Sale = require('../models/saleModel');
const Product = require('../models/productModel');

// @desc    Get dashboard summary statistics
// @route   GET /api/reports/summary
const getDashboardSummary = async (req, res) => {
  try {
    // 1. Get total revenue and number of sales using aggregation
    const salesData = await Sale.aggregate([
      {
        $group: {
          _id: null, // Group all sales together
          totalRevenue: { $sum: '$totalAmount' },
          totalSales: { $sum: 1 }
        }
      }
    ]);

    // 2. Get product-related statistics
    const productStats = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 }, // Count total number of product documents
          totalStock: { $sum: '$quantity' } // Sum up the quantity of all products
        }
      }
    ]);

    // 3. Get top 5 selling products by quantity
    const topSellingProducts = await Sale.aggregate([
      { $unwind: '$items' }, // Deconstruct the items array from each sale
      { 
        $group: {
            _id: '$items.product', // Group by the product's ID
            totalQuantitySold: { $sum: '$items.quantity' } // Sum the quantity for each product
        }
      },
      { $sort: { totalQuantitySold: -1 } }, // Sort in descending order
      { $limit: 5 }, // Limit to the top 5
      { 
        $lookup: { // Join with the 'products' collection to get product details
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' } // Deconstruct the productInfo array created by $lookup
    ]);
    
    // Combine all stats into a single response object
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