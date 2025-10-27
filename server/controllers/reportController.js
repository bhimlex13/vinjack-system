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

// Helper to create a date filter object
const createDateFilter = (range) => {
  const dateFilter = {};
  const now = new Date();
  const timezone = 'Asia/Manila'; // Use your specific timezone

  // Helper function to get the start of the day in the specified timezone
  const getStartOfDay = (date) => {
    const d = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const todayStart = getStartOfDay(now);

  switch (range) {
    case 'today':
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      dateFilter.baseField = { $gte: todayStart, $lt: tomorrowStart };
      break;
    case 'week':
      const dayOfWeek = todayStart.getDay(); // 0 for Sunday
      const startOfWeek = new Date(todayStart);
      startOfWeek.setDate(todayStart.getDate() - dayOfWeek);
      dateFilter.baseField = { $gte: startOfWeek };
      break;
    case 'month':
      const startOfMonth = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
      dateFilter.baseField = { $gte: startOfMonth };
      break;
    default: // 'all' or undefined
      // No date filter needed for 'all'
      break;
  }
  // This object needs the date field name applied later (e.g., { createdAt: dateFilter.baseField })
  return dateFilter;
};


// @desc    Get dashboard summary statistics
// @route   GET /api/reports/summary
const getDashboardSummary = async (req, res) => {
  try {
    const { range, categoryId, supplierId } = req.query;
    const dateFilterObj = createDateFilter(range);
    const saleDateFilter = dateFilterObj.baseField ? { createdAt: dateFilterObj.baseField } : {};
    const timezone = "Asia/Manila"; // Consistent timezone

    // --- Product filter for direct aggregations (SKUs, Stock Qty, Slow Moving) ---
    const productFilter = {};
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
        productFilter.category = new mongoose.Types.ObjectId(categoryId);
    }
    // --- Supplier filter on products now checks supplierCosts ---
    if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
        productFilter['supplierCosts.supplier'] = new mongoose.Types.ObjectId(supplierId);
    }

    // --- Stages for filtering sales based on related product properties ---
    // These stages are used when aggregating Sales data but needing to filter based
    // on the category or supplier of the sold ITEMS.
    const salesProductFilterStages = [];
    if (categoryId || supplierId) {
        // We need to look up the product details for each item in the sale
        salesProductFilterStages.push(
            // Can't unwind items here yet, need it for COGS calc later
            // { $unwind: '$items' },
            {
              $lookup: {
                from: 'products', // The collection to join
                localField: 'items.product', // Field from the input documents (sales.items array)
                foreignField: '_id', // Field from the documents of the "from" collection (products)
                as: 'productDetails' // Output array field name
              }
            }
        );
        // Now filter the SALES document if ANY of its productDetails match the criteria
        let productMatchCriteria = {};
        if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
            productMatchCriteria['productDetails.category'] = new mongoose.Types.ObjectId(categoryId);
        }
        if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
            productMatchCriteria['productDetails.supplierCosts.supplier'] = new mongoose.Types.ObjectId(supplierId);
        }
        salesProductFilterStages.push({
            $match: productMatchCriteria
        });
    }


    const [
        // --- Combined aggregation for Revenue, COGS, Sales Count & Quantity Sold ---
        salesProfitQtyData,
        productStats,
        topSellingProducts,
        slowMovingProducts,
        topSellingServices,
        categorySummary
    ] = await Promise.all([
      // Aggregation for Revenue, COGS, Sales Count & Quantity Sold
      Sale.aggregate([
        // 1. Initial Match (Date Filter)
        { $match: saleDateFilter },

        // 2. Apply Product Filters if needed (Lookup + Match on product properties)
        ...(salesProductFilterStages.length > 0 ? salesProductFilterStages : []),

        // 3. Unwind the items array *after* potentially filtering sales docs
        { $unwind: '$items' },

        // 4. Group to calculate totals
        {
          $group: {
            _id: null, // Group all matching sales together
            // Sum totalAmount ONCE per original sale document ID
            totalRevenue: { $addToSet: { saleId: '$_id', amount: '$totalAmount' } }, // Collect unique sales amounts
            totalCOGS: {
              $sum: { // Sum COGS for each item
                $multiply: [ '$items.quantity', { $ifNull: [ '$items.costOfGoodsSold', 0 ] } ] // Use costOfGoodsSold
              }
            },
            totalQuantitySold: { $sum: '$items.quantity' }, // Sum quantities from unwound items
          }
        },
        // 5. Final Projection
        {
          $project: {
            _id: 0,
            // Sum the unique sale amounts collected in the previous stage
            totalRevenue: { $sum: '$totalRevenue.amount' },
            totalCOGS: { $ifNull: [ '$totalCOGS', 0 ] },
            totalSales: { $size: { $ifNull: [ '$totalRevenue', [] ] } }, // Count unique sales by the size of the set
            totalQuantitySold: { $ifNull: [ '$totalQuantitySold', 0 ] }
          }
        }
      ]),

      // Product Totals (SKUs, Stock Qty) - Uses direct productFilter
      Product.aggregate([
        { $match: productFilter },
        { $group: { _id: null, totalSKUs: { $sum: 1 }, totalStockQuantity: { $sum: '$quantity' } } }
      ]),

      // Top Selling Products (Aggregates Sales based on date/product filters)
      Sale.aggregate([
          { $match: saleDateFilter }, // Date filter on Sales
          ...(salesProductFilterStages.length > 0 ? salesProductFilterStages : []), // Apply product filters if needed
          { $unwind: '$items' }, // Now unwind items
          // --- Re-apply product filter conditions if needed, this time on items directly ---
          // This is necessary if salesProductFilterStages wasn't applied or if you need finer control
          ...(salesProductFilterStages.length === 0 && (categoryId || supplierId) ? [
              { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'prodInfo' } },
              { $unwind: '$prodInfo' },
              { $match: productFilter } // Apply productFilter here
          ] : []),
          // ---
          { $group: { _id: '$items.product', totalQuantitySold: { $sum: '$items.quantity' } } }, // Group by product ID
          { $sort: { totalQuantitySold: -1 } },
          { $limit: 5 },
          { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productInfo' } },
          { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
          { $project: { _id: 1, totalQuantitySold: 1, productInfo: { _id: '$_id', name: { $ifNull: ['$productInfo.name', 'Deleted Product'] } } } }
      ]),

      // Slow Moving Products (Aggregates Products based on productFilter, looks up Sales based on dateFilter)
      Product.aggregate([
        { $match: productFilter }, // Direct filter on products
        {
          $lookup: { // Join sales collection
            from: 'sales', let: { productId: '$_id' },
            pipeline: [
              { $match: saleDateFilter }, // Filter sales by date
              { $unwind: '$items' },
              { $match: { $expr: { $eq: ['$items.product', '$$productId'] } } }, // Match items to product
              { $group: { _id: null, totalQuantitySold: { $sum: '$items.quantity' } } } // Sum sales quantity
            ],
            as: 'salesData'
          }
        },
        { $project: { _id: 1, productInfo: { _id: '$_id', name: '$name' }, totalQuantitySold: { $ifNull: [{ $arrayElemAt: ['$salesData.totalQuantitySold', 0] }, 0] } } }, // Get sold qty or 0
        { $sort: { totalQuantitySold: 1 } }, // Sort ascending
        { $limit: 5 }
      ]),

      // Top Selling Services (Aggregates Sales based on dateFilter)
      Sale.aggregate([
        { $match: saleDateFilter },
        { $unwind: '$services' },
        { $group: { _id: '$services.service', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'serviceInfo' } },
        { $unwind: { path: '$serviceInfo', preserveNullAndEmptyArrays: true } }
      ]),

      // Category Summary (Aggregates Products based on productFilter)
      Product.aggregate([
        { $match: productFilter },
        { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'categoryInfo' } },
        { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$categoryInfo.name', skuCount: { $sum: 1 }, totalStock: { $sum: '$quantity' } } },
        { $project: { _id: 0, categoryName: { $ifNull: ['$_id', 'Uncategorized'] }, skuCount: 1, totalStock: 1 } },
        { $sort: { categoryName: 1 } }
      ])
    ]);

    // --- Extract results using the corrected aggregation ---
    const salesResult = salesProfitQtyData[0] || {};
    const totalRevenue = salesResult.totalRevenue || 0;
    const totalCOGS = salesResult.totalCOGS || 0;
    const totalSales = salesResult.totalSales || 0;
    const totalQuantitySold = salesResult.totalQuantitySold || 0;
    const totalProfit = totalRevenue - totalCOGS; // Calculate profit using correct COGS

    // --- Send the combined results ---
    res.json({
      totalRevenue: totalRevenue,
      totalProfit: totalProfit,
      totalSales: totalSales,
      totalQuantitySold: totalQuantitySold,
      totalSKUs: productStats[0]?.totalSKUs || 0,
      totalStockQuantity: productStats[0]?.totalStockQuantity || 0,
      topSellingProducts: topSellingProducts.map(p => ({ ...p, productInfo: p.productInfo })),
      slowMovingProducts: slowMovingProducts.map(p => ({ ...p, productInfo: p.productInfo })),
      topSellingServices: topSellingServices.map(s => ({ ...s, serviceInfo: s.serviceInfo || { _id: s._id, name: 'Deleted Service' } })),
      categorySummary: categorySummary || []
    });

  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({ message: 'Server Error fetching dashboard summary.', error: error.message });
  }
};


// --- getSalesReport --- (Populate costOfGoodsSold instead of product cost)
const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, customerId, userId } = req.query;
    const filter = {};
    if (startDate && endDate) {
        // Ensure correct date range filtering including the end date
        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }
    if (customerId) filter.customer = customerId;
    if (userId) filter.recordedBy = userId;

    const sales = await Sale.find(filter)
      .sort({ createdAt: -1 })
      .populate('recordedBy', 'fullName')
      // --- Populate product name, but cost comes from costOfGoodsSold ---
      .populate('items.product', 'name itemCode') // Removed cost population here
      .populate('services.service', 'name')
      .populate('customer', 'name');

    // --- Optionally format the response if needed, but the data is there ---
    // const formattedSales = sales.map(sale => ({
    //   ...sale.toObject(), // Convert mongoose doc to plain object
    //   items: sale.items.map(item => ({
    //     ...item.toObject(),
    //     cost: item.costOfGoodsSold // Make it explicit if frontend expects 'cost'
    //   }))
    // }));

    res.json(sales); // Send sales with costOfGoodsSold included in items
  } catch (error) {
    console.error("Error fetching sales report:", error);
    res.status(500).json({ message: 'Server Error fetching sales report.', error: error.message });
  }
};

// --- getLowStockProducts --- (Unchanged)
const getLowStockProducts = async (req, res) => {
  try {
    const lowStockProducts = await Product.find({
      stockStatus: { $in: ['Low', 'Critical', 'Out of Stock'] }
    })
    .select('name quantity maxStock stockStatus') // Select relevant fields
    .sort({ quantity: 'asc' }); // Sort by lowest quantity first
    // .limit(10); // Optionally limit results
    res.json(lowStockProducts);
  } catch (error) {
     console.error("Error fetching low stock products:", error);
    res.status(500).json({ message: 'Server Error fetching low stock products.', error: error.message });
  }
};

// --- getSalesTrend --- (Unchanged)
const getSalesTrend = async (req, res) => {
  try {
    const { range } = req.query;
    const dateFilterObj = createDateFilter(range);
    const saleDateFilter = dateFilterObj.baseField ? { createdAt: dateFilterObj.baseField } : {};
    let groupByFormat = "%Y-%m-%d";
    const timezone = "Asia/Manila";
    switch (range) {
      case 'today': groupByFormat = "%Y-%m-%d %H:00"; break; // Group by hour for today
      case 'week': case 'month': groupByFormat = "%Y-%m-%d"; break; // Group by day for week/month
      case 'all': default: groupByFormat = "%Y-%m"; break; // Group by month for all time
    }
    const salesTrend = await Sale.aggregate([
      { $match: saleDateFilter },
      { $group: {
          _id: { $dateToString: { format: groupByFormat, date: "$createdAt", timezone: timezone } },
          totalSales: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } } // Sort chronologically
    ]);
    res.json(salesTrend);
  } catch (error) {
    console.error("Error fetching sales trend:", error);
    res.status(500).json({ message: 'Server Error fetching sales trend.', error: error.message });
  }
};

// --- getRecentActivities --- (Unchanged)
const getRecentActivities = async (req, res) => {
  try {
    const limitPerType = 5; const overallLimit = 10;
    const [recentSales, recentDeliveries, recentAdjustments, recentReturns] = await Promise.all([
      Sale.find({}).sort({ createdAt: -1 }).limit(limitPerType).select('_id createdAt totalAmount recordedBy customer').populate('recordedBy', 'fullName').populate('customer', 'name'),
      Delivery.find({}).sort({ deliveryDate: -1 }).limit(limitPerType).select('_id deliveryDate totalCost supplier recordedBy').populate('recordedBy', 'fullName').populate('supplier', 'name'),
      Movement.find({ type: 'ADJUSTMENT' }).sort({ createdAt: -1 }).limit(limitPerType).select('_id createdAt quantityChange stockBefore product recordedBy reason').populate('recordedBy', 'fullName').populate('product', 'name'),
      Return.find({}).sort({ createdAt: -1 }).limit(limitPerType).select('_id createdAt totalRefundAmount outcome recordedBy originalSale').populate('recordedBy', 'fullName').populate('originalSale', '_id')
    ]);
    const mappedSales = recentSales.map(s => ({ id: s._id, type: 'Sale', date: s.createdAt, user: s.recordedBy?.fullName || 'System', description: `Sale to ${s.customer?.name || 'Walk-in'} - ₱${(s.totalAmount ?? 0).toFixed(2)}` }));
    const mappedDeliveries = recentDeliveries.map(d => ({ id: d._id, type: 'Delivery', date: d.deliveryDate, user: d.recordedBy?.fullName || 'System', description: `Delivery from ${d.supplier?.name || 'N/A'} - ₱${(d.totalCost ?? 0).toFixed(2)}` }));
    const mappedAdjustments = recentAdjustments.map(m => ({ id: m._id, type: 'Adjustment', date: m.createdAt, user: m.recordedBy?.fullName || 'System', description: `Stock Adj. for ${m.product?.name || 'N/A'}: ${m.quantityChange > 0 ? '+' : ''}${m.quantityChange} units. ${m.reason ? `Reason: ${m.reason}`: ''}`.trim() }));
    const mappedReturns = recentReturns.map(r => ({ id: r._id, type: 'Return', date: r.createdAt, user: r.recordedBy?.fullName || 'System', description: `Return (Sale #${r.originalSale?._id || 'N/A'}) - Outcome: ${r.outcome}, Refund: ₱${(r.totalRefundAmount ?? 0).toFixed(2)}` }));
    const combinedActivities = [...mappedSales, ...mappedDeliveries, ...mappedAdjustments, ...mappedReturns];
    combinedActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentActivities = combinedActivities.slice(0, overallLimit);
    res.json(recentActivities);
  } catch (error) {
    console.error("Error fetching recent activities:", error);
    res.status(500).json({ message: 'Server Error fetching recent activities.', error: error.message });
  }
};

// --- getPendingPurchaseOrders --- (Unchanged)
const getPendingPurchaseOrders = async (req, res) => {
  try {
    const pendingPOs = await PurchaseOrder.find({ status: { $in: ['Pending', 'Approved', 'Partially Received', 'Awaiting Approval'] } })
    .sort({ orderDate: 'asc' }).limit(5).select('poNumber status');
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