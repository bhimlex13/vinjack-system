// server/controllers/reportController.js
const Sale = require('../models/saleModel');
const Product = require('../models/productModel');
const PurchaseOrder = require('../models/purchaseOrderModel');
const Service = require('../models/serviceModel');
const Category = require('../models/categoryModel');
const Delivery = require('../models/deliveryModel');
const Movement = require('../models/movementModel');
const Return = require('../models/returnModel');
const mongoose = require('mongoose');

// Helper to create a date filter object (No change)
const createDateFilter = (range) => {
  const dateFilter = {};
  const now = new Date();
  const timezone = 'Asia/Manila';

  switch (range) {
    case 'today':
      const todayStartManila = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      todayStartManila.setHours(0, 0, 0, 0);
      const tomorrowStartManila = new Date(todayStartManila);
      tomorrowStartManila.setDate(tomorrowStartManila.getDate() + 1);
      // For sales/deliveries etc. use createdAt or relevant date field
      dateFilter.baseField = { $gte: todayStartManila, $lt: tomorrowStartManila };
      break;
    case 'week':
      const nowManilaWeek = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      const dayOfWeek = nowManilaWeek.getDay(); // 0 for Sunday
      const startOfWeekManila = new Date(nowManilaWeek);
      startOfWeekManila.setDate(nowManilaWeek.getDate() - dayOfWeek);
      startOfWeekManila.setHours(0, 0, 0, 0);
      dateFilter.baseField = { $gte: startOfWeekManila };
      break;
    case 'month':
      const nowManilaMonth = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      const firstDayOfMonthManila = new Date(nowManilaMonth.getFullYear(), nowManilaMonth.getMonth(), 1);
      firstDayOfMonthManila.setHours(0, 0, 0, 0);
      dateFilter.baseField = { $gte: firstDayOfMonthManila };
      break;
    default: // 'all' or undefined
      // No date filter needed for 'all'
      break;
  }
  // Replace 'baseField' with actual date field name for specific queries
  return dateFilter;
};


// @desc    Get dashboard summary statistics
// @route   GET /api/reports/summary
const getDashboardSummary = async (req, res) => {
  try {
    const { range, categoryId, supplierId } = req.query;
    // --- Get date filter object ---
    const dateFilterObj = createDateFilter(range);
    // --- Create specific filters for each collection ---
    const saleDateFilter = dateFilterObj.baseField ? { createdAt: dateFilterObj.baseField } : {};
    const productDateFilter = {}; // Usually no date filter needed directly on products for summary
    const timezone = "Asia/Manila";

    // Create product filter for direct product aggregations (No change)
    const productFilter = {};
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
        productFilter.category = new mongoose.Types.ObjectId(categoryId);
    }
    if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
        productFilter.suppliers = new mongoose.Types.ObjectId(supplierId);
    }

    // Create stages for filtering sales based on product properties (No change)
    const salesProductFilterStages = [];
    if (categoryId || supplierId) {
        salesProductFilterStages.push(
            { $unwind: '$items' },
            { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'productInfo' } },
            { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } }
        );
        if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
            salesProductFilterStages.push({ $match: { 'productInfo.category': new mongoose.Types.ObjectId(categoryId) } });
        }
        if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
            salesProductFilterStages.push({ $match: { 'productInfo.suppliers': new mongoose.Types.ObjectId(supplierId) } });
        }
    }


    const [
        salesData,
        cogsData,
        productStats,
        topSellingProducts, // <-- This query is now fixed
        slowMovingProducts,
        topSellingServices,
        categorySummary
    ] = await Promise.all([
      // Revenue, Sales Count & Quantity Sold ($facet) - (Uses saleDateFilter)
      Sale.aggregate([
        { $match: saleDateFilter }, // Apply date filter
        ...(salesProductFilterStages.length > 0 ? salesProductFilterStages : [{ $unwind: '$items' }]),
        { $group: { _id: '$_id', totalAmount: { $first: '$totalAmount' }, totalQuantitySoldInSale: { $sum: '$items.quantity' } } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalSales: { $sum: 1 }, totalQuantitySold: { $sum: '$totalQuantitySoldInSale' } } },
        { $project: { _id: 0, totalRevenue: { $ifNull: [ '$totalRevenue', 0 ] }, totalSales: { $ifNull: [ '$totalSales', 0 ] }, totalQuantitySold: { $ifNull: [ '$totalQuantitySold', 0 ] } } }
      ]),

      // Total COGS - (Uses saleDateFilter)
      Sale.aggregate([
        { $match: saleDateFilter }, // Apply date filter
        ...salesProductFilterStages,
        ...(salesProductFilterStages.length === 0 ? [
            { $unwind: '$items' },
            { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'productInfo' } },
            { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } }
        ] : []),
        {
          $group: {
            _id: null,
            totalCOGS: { $sum: { $multiply: [ { $toDouble: { $ifNull: ['$items.quantity', 0] } }, { $toDouble: { $ifNull: ['$productInfo.cost', 0] } } ] } }
          }
        }
      ]),

      // Product Totals - (Uses productFilter only)
      Product.aggregate([
        { $match: productFilter },
        { $group: { _id: null, totalSKUs: { $sum: 1 }, totalStockQuantity: { $sum: '$quantity' } } }
      ]),

      // --- MODIFIED: Top Selling Products (Bug Fix - Robust Lookup) ---
      Sale.aggregate([
          { $match: saleDateFilter }, // 1. Filter sales by date
          { $unwind: '$items' },
          // 2. Apply category/supplier filters *if needed*
          ...(salesProductFilterStages.length > 0 ? salesProductFilterStages.slice(1) : []), // Apply lookup/match stages from salesProductFilterStages if they exist (skip initial unwind)
          // 3. Group by product ID and sum quantity sold
          { $group: { _id: '$items.product', totalQuantitySold: { $sum: '$items.quantity' } } },
          // 4. Sort by quantity sold descending
          { $sort: { totalQuantitySold: -1 } },
          // 5. Limit to top 5
          { $limit: 5 },
          // 6. Lookup product details *after* grouping
          { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productInfo' } },
          // 7. Unwind the product details (handle potential missing products)
          { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
          // 8. Project the final structure
          {
            $project: {
              _id: 1, // Keep product ID
              totalQuantitySold: 1,
              // Use productInfo if available, otherwise provide fallback
              productInfo: {
                  _id: '$_id',
                  name: { $ifNull: ['$productInfo.name', 'Deleted Product'] }
              }
            }
          }
      ]),
      // --- END MODIFICATION ---

      // Slow Moving Products - (Uses productFilter, looks up sales with saleDateFilter) (No change from previous correct version)
      Product.aggregate([
        { $match: productFilter }, // Apply category/supplier filters to Products
        {
          $lookup: { // Join sales collection
            from: 'sales',
            let: { productId: '$_id' },
            pipeline: [
              { $match: saleDateFilter }, // Filter sales by the date range
              { $unwind: '$items' },
              { $match: { $expr: { $eq: ['$items.product', '$$productId'] } } }, // Find matching sales
              { $group: { _id: null, totalQuantitySold: { $sum: '$items.quantity' } } }
            ],
            as: 'salesData'
          }
        },
        {
          $project: { // Format output
            _id: 1,
            productInfo: { _id: '$_id', name: '$name' }, // Use product's name
            totalQuantitySold: { $ifNull: [{ $arrayElemAt: ['$salesData.totalQuantitySold', 0] }, 0] } // Default to 0 if no sales
          }
        },
        { $sort: { totalQuantitySold: 1 } }, // Sort by lowest sales (ascending)
        { $limit: 5 }
      ]),

      // Top Selling Services - (Uses saleDateFilter)
      Sale.aggregate([
        { $match: saleDateFilter }, // Apply date filter
        { $unwind: '$services' },
        { $group: { _id: '$services.service', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'serviceInfo' } },
        { $unwind: { path: '$serviceInfo', preserveNullAndEmptyArrays: true } }
      ]),

      // Category Summary - (Uses productFilter only)
      Product.aggregate([
        { $match: productFilter },
        { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'categoryInfo' } },
        { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$categoryInfo.name', skuCount: { $sum: 1 }, totalStock: { $sum: '$quantity' } } },
        { $project: { _id: 0, categoryName: { $ifNull: ['$_id', 'Uncategorized'] }, skuCount: 1, totalStock: 1 } },
        { $sort: { categoryName: 1 } }
      ])
    ]);

    // Extract results (No change)
    const revenueResult = salesData[0] || {};
    const totalRevenue = revenueResult.totalRevenue || 0;
    const totalSales = revenueResult.totalSales || 0;
    const totalQuantitySold = revenueResult.totalQuantitySold || 0;
    const totalCOGS = cogsData[0]?.totalCOGS || 0;
    const totalProfit = totalRevenue - totalCOGS;

    // Send the combined results (No change)
    res.json({
      totalRevenue: totalRevenue,
      totalProfit: totalProfit,
      totalSales: totalSales,
      totalQuantitySold: totalQuantitySold,
      totalSKUs: productStats[0]?.totalSKUs || 0,
      totalStockQuantity: productStats[0]?.totalStockQuantity || 0,
      topSellingProducts: topSellingProducts.map(p => ({ // This data should now be correct
        ...p,
        productInfo: p.productInfo // Use the projected productInfo
      })),
      slowMovingProducts: slowMovingProducts.map(p => ({
        ...p,
        productInfo: p.productInfo // Use the projected productInfo
      })),
      topSellingServices: topSellingServices.map(s => ({
        ...s,
        serviceInfo: s.serviceInfo || { _id: s._id, name: 'Deleted Service' }
      })),
      categorySummary: categorySummary || []
    });

  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({ message: 'Server Error fetching dashboard summary.', error: error.message });
  }
};

// --- getSalesReport --- (No change)
const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, customerId, userId } = req.query;
    const filter = {};
    if (startDate && endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setDate(endOfDay.getDate() + 1);
        filter.createdAt = { $gte: new Date(startDate), $lt: endOfDay };
    }
    if (customerId) filter.customer = customerId;
    if (userId) filter.recordedBy = userId;
    const sales = await Sale.find(filter)
      .sort({ createdAt: -1 })
      .populate('recordedBy', 'fullName')
      .populate('items.product', 'name cost')
      .populate('services.service', 'name')
      .populate('customer', 'name');
    res.json(sales);
  } catch (error) {
    console.error("Error fetching sales report:", error);
    res.status(500).json({ message: 'Server Error fetching sales report.', error: error.message });
  }
};

// --- getLowStockProducts --- (No change)
const getLowStockProducts = async (req, res) => {
  try {
    // --- Uses stockStatus field now for consistency ---
    const lowStockProducts = await Product.find({
      stockStatus: { $in: ['Low', 'Critical', 'Out of Stock'] }
    })
    .select('name quantity reorderLevel stockStatus') // Include stockStatus
    .sort({ quantity: 'asc' })
    .limit(10); // Limit results for dashboard widget
    res.json(lowStockProducts);
  } catch (error) {
     console.error("Error fetching low stock products:", error);
    res.status(500).json({ message: 'Server Error fetching low stock products.', error: error.message });
  }
};

// --- getSalesTrend --- (No change)
const getSalesTrend = async (req, res) => {
  try {
    const { range } = req.query;
    // --- Get date filter object and apply specific field ---
    const dateFilterObj = createDateFilter(range);
    const saleDateFilter = dateFilterObj.baseField ? { createdAt: dateFilterObj.baseField } : {};
    // --- Determine grouping format ---
    let groupByFormat = "%Y-%m-%d";
    const timezone = "Asia/Manila";
    switch (range) {
      case 'today': groupByFormat = "%Y-%m-%d %H:00"; break;
      case 'week':
      case 'month': groupByFormat = "%Y-%m-%d"; break;
      case 'all': default: groupByFormat = "%Y-%m"; break;
    }
    // --- Aggregate ---
    const salesTrend = await Sale.aggregate([
      { $match: saleDateFilter }, // Apply date filter
      {
        $group: {
          _id: { $dateToString: { format: groupByFormat, date: "$createdAt", timezone: timezone } },
          totalSales: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    res.json(salesTrend);
  } catch (error) {
    console.error("Error fetching sales trend:", error);
    res.status(500).json({ message: 'Server Error fetching sales trend.', error: error.message });
  }
};

// --- getRecentActivities --- (No change)
const getRecentActivities = async (req, res) => {
  try {
    const limitPerType = 5;
    const overallLimit = 10;

    const [recentSales, recentDeliveries, recentAdjustments, recentReturns] = await Promise.all([
      // Sales
      Sale.find({}).sort({ createdAt: -1 }).limit(limitPerType).select('_id createdAt totalAmount recordedBy customer').populate('recordedBy', 'fullName').populate('customer', 'name'),
      // Deliveries
      Delivery.find({}).sort({ deliveryDate: -1 }).limit(limitPerType).select('_id deliveryDate totalCost supplier recordedBy').populate('recordedBy', 'fullName').populate('supplier', 'name'),
      // Adjustments
      Movement.find({ type: 'ADJUSTMENT' }).sort({ createdAt: -1 }).limit(limitPerType).select('_id createdAt quantityChange stockBefore product recordedBy reason').populate('recordedBy', 'fullName').populate('product', 'name'),
      // Returns
      Return.find({}).sort({ createdAt: -1 }).limit(limitPerType).select('_id createdAt totalRefundAmount outcome recordedBy originalSale').populate('recordedBy', 'fullName').populate('originalSale', '_id')
    ]);

    // Map and add type (No change)
    const mappedSales = recentSales.map(s => ({ id: s._id, type: 'Sale', date: s.createdAt, user: s.recordedBy?.fullName || 'System', description: `Sale to ${s.customer?.name || 'Walk-in'} - ₱${(s.totalAmount ?? 0).toFixed(2)}` }));
    const mappedDeliveries = recentDeliveries.map(d => ({ id: d._id, type: 'Delivery', date: d.deliveryDate, user: d.recordedBy?.fullName || 'System', description: `Delivery from ${d.supplier?.name || 'N/A'} - ₱${(d.totalCost ?? 0).toFixed(2)}` }));
    const mappedAdjustments = recentAdjustments.map(m => ({ id: m._id, type: 'Adjustment', date: m.createdAt, user: m.recordedBy?.fullName || 'System', description: `Stock Adj. for ${m.product?.name || 'N/A'}: ${m.quantityChange > 0 ? '+' : ''}${m.quantityChange} units. ${m.reason ? `Reason: ${m.reason}`: ''}`.trim() }));
    const mappedReturns = recentReturns.map(r => ({ id: r._id, type: 'Return', date: r.createdAt, user: r.recordedBy?.fullName || 'System', description: `Return (Sale #${r.originalSale?._id || 'N/A'}) - Outcome: ${r.outcome}, Refund: ₱${(r.totalRefundAmount ?? 0).toFixed(2)}` }));

    // Combine, Sort, and Limit (No change)
    const combinedActivities = [...mappedSales, ...mappedDeliveries, ...mappedAdjustments, ...mappedReturns];
    combinedActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentActivities = combinedActivities.slice(0, overallLimit);

    res.json(recentActivities);

  } catch (error) {
    console.error("Error fetching recent activities:", error);
    res.status(500).json({ message: 'Server Error fetching recent activities.', error: error.message });
  }
};

// --- getPendingPurchaseOrders --- (No change)
const getPendingPurchaseOrders = async (req, res) => {
  try {
    const pendingPOs = await PurchaseOrder.find({
      status: { $in: ['Pending', 'Approved', 'Partially Received', 'Awaiting Approval'] } // Added Awaiting Approval
    })
    .sort({ orderDate: 'asc' })
    .limit(5)
    .select('poNumber status'); // Keep it simple for dashboard
    res.json(pendingPOs);
  } catch (error){
    console.error("Error fetching pending POs:", error);
    res.status(500).json({ message: 'Server Error fetching pending purchase orders.', error: error.message });
  }
};


module.exports = {
    getDashboardSummary,
    getSalesReport,
    getLowStockProducts,
    getSalesTrend,
    getRecentActivities,
    getPendingPurchaseOrders
};