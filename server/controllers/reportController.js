// server/controllers/reportController.js
const Sale = require('../models/saleModel');
const Product = require('../models/productModel');
const PurchaseOrder = require('../models/purchaseOrderModel');
const Service = require('../models/serviceModel');
const Category = require('../models/categoryModel');
const Delivery = require('../models/deliveryModel');
const Movement = require('../models/movementModel');
// --- NEW: Import Return and SupplierReturn models ---
const Return = require('../models/returnModel');
const SupplierReturn = require('../models/supplierReturnModel');
// --- END NEW ---
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
  return dateFilter;
};


// @desc    Get dashboard summary statistics
// @route   GET /api/reports/summary
const getDashboardSummary = async (req, res) => {
  try {
    const { range, categoryId, supplierId } = req.query;
    const dateFilterObj = createDateFilter(range);
    const saleDateFilter = dateFilterObj.baseField ? { createdAt: dateFilterObj.baseField } : {};
    const timezone = "Asia/Manila"; 

    const productFilter = {};
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
        productFilter.category = new mongoose.Types.ObjectId(categoryId);
    }
    if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
        productFilter['supplierCosts.supplier'] = new mongoose.Types.ObjectId(supplierId);
    }

    const salesProductFilterStages = [];
    if (categoryId || supplierId) {
        salesProductFilterStages.push(
            {
              $lookup: {
                from: 'products', 
                localField: 'items.product', 
                foreignField: '_id', 
                as: 'productDetails' 
              }
            }
        );
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
        salesProfitQtyData,
        productStats,
        topSellingProducts,
        slowMovingProducts,
        topSellingServices,
        categorySummary
    ] = await Promise.all([
      Sale.aggregate([
        { $match: saleDateFilter },
        ...(salesProductFilterStages.length > 0 ? salesProductFilterStages : []),
        { $unwind: '$items' },
        {
          $group: {
            _id: null, 
            totalRevenue: { $addToSet: { saleId: '$_id', amount: '$totalAmount' } }, 
            totalCOGS: {
              $sum: { 
                $multiply: [ '$items.quantity', { $ifNull: [ '$items.costOfGoodsSold', 0 ] } ] 
              }
            },
            totalQuantitySold: { $sum: '$items.quantity' }, 
          }
        },
        {
          $project: {
            _id: 0,
            totalRevenue: { $sum: '$totalRevenue.amount' },
            totalCOGS: { $ifNull: [ '$totalCOGS', 0 ] },
            totalSales: { $size: { $ifNull: [ '$totalRevenue', [] ] } }, 
            totalQuantitySold: { $ifNull: [ '$totalQuantitySold', 0 ] }
          }
        }
      ]),

      Product.aggregate([
        { $match: productFilter },
        { $group: { _id: null, totalSKUs: { $sum: 1 }, totalStockQuantity: { $sum: '$quantity' } } }
      ]),

      Sale.aggregate([
          { $match: saleDateFilter }, 
          ...(salesProductFilterStages.length > 0 ? salesProductFilterStages : []), 
          { $unwind: '$items' }, 
          ...(salesProductFilterStages.length === 0 && (categoryId || supplierId) ? [
              { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'prodInfo' } },
              { $unwind: '$prodInfo' },
              { $match: productFilter } 
          ] : []),
          { $group: { _id: '$items.product', totalQuantitySold: { $sum: '$items.quantity' } } }, 
          { $sort: { totalQuantitySold: -1 } },
          { $limit: 5 },
          { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productInfo' } },
          { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
          { $project: { _id: 1, totalQuantitySold: 1, productInfo: { _id: '$_id', name: { $ifNull: ['$productInfo.name', 'Deleted Product'] } } } }
      ]),

      Product.aggregate([
        { $match: productFilter }, 
        {
          $lookup: { 
            from: 'sales', let: { productId: '$_id' },
            pipeline: [
              { $match: saleDateFilter }, 
              { $unwind: '$items' },
              { $match: { $expr: { $eq: ['$items.product', '$$productId'] } } }, 
              { $group: { _id: null, totalQuantitySold: { $sum: '$items.quantity' } } } 
            ],
            as: 'salesData'
          }
        },
        { $project: { _id: 1, productInfo: { _id: '$_id', name: '$name' }, totalQuantitySold: { $ifNull: [{ $arrayElemAt: ['$salesData.totalQuantitySold', 0] }, 0] } } }, 
        { $sort: { totalQuantitySold: 1 } }, 
        { $limit: 5 }
      ]),

      Sale.aggregate([
        { $match: saleDateFilter },
        { $unwind: '$services' },
        { $group: { _id: '$services.service', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'serviceInfo' } },
        { $unwind: { path: '$serviceInfo', preserveNullAndEmptyArrays: true } }
      ]),

      Product.aggregate([
        { $match: productFilter },
        { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'categoryInfo' } },
        { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$categoryInfo.name', skuCount: { $sum: 1 }, totalStock: { $sum: '$quantity' } } },
        { $project: { _id: 0, categoryName: { $ifNull: ['$_id', 'Uncategorized'] }, skuCount: 1, totalStock: 1 } },
        { $sort: { categoryName: 1 } }
      ])
    ]);

    const salesResult = salesProfitQtyData[0] || {};
    const totalRevenue = salesResult.totalRevenue || 0;
    const totalCOGS = salesResult.totalCOGS || 0;
    const totalSales = salesResult.totalSales || 0;
    const totalQuantitySold = salesResult.totalQuantitySold || 0;
    const totalProfit = totalRevenue - totalCOGS; 

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


const getSalesReport = async (req, res) => {
  try {
    const { 
      startDate, endDate, customerId, userId, 
      productId, supplierId 
    } = req.query;
    
    const filter = {};

    if (startDate && endDate) {
        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      filter.customer = new mongoose.Types.ObjectId(customerId);
    }
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filter.recordedBy = new mongoose.Types.ObjectId(userId);
    }

    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      filter['items.product'] = new mongoose.Types.ObjectId(productId);
    } 
    
    else if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
      const productsFromSupplier = await Product.find({ 
        'supplierCosts.supplier': new mongoose.Types.ObjectId(supplierId) 
      }).select('_id');
      
      const productIds = productsFromSupplier.map(p => p._id);
      
      if (productIds.length > 0) {
        filter['items.product'] = { $in: productIds };
      } else {
        return res.json([]);
      }
    }

    const sales = await Sale.find(filter)
      .sort({ createdAt: -1 })
      .populate('recordedBy', 'fullName')
      .populate('items.product', 'name itemCode') 
      .populate('services.service', 'name')
      .populate('customer', 'name');

    res.json(sales);
  } catch (error) {
    console.error("Error fetching sales report:", error);
    res.status(500).json({ message: 'Server Error fetching sales report.', error: error.message });
  }
};

const getLowStockProducts = async (req, res) => {
  try {
    const lowStockProducts = await Product.find({
      stockStatus: { $in: ['Low', 'Critical', 'Out of Stock'] }
    })
    .select('name quantity maxStock stockStatus') 
    .sort({ quantity: 'asc' }); 
    res.json(lowStockProducts);
  } catch (error) {
     console.error("Error fetching low stock products:", error);
    res.status(500).json({ message: 'Server Error fetching low stock products.', error: error.message });
  }
};

const getSalesTrend = async (req, res) => {
  try {
    const { range } = req.query;
    const dateFilterObj = createDateFilter(range);
    const saleDateFilter = dateFilterObj.baseField ? { createdAt: dateFilterObj.baseField } : {};
    let groupByFormat = "%Y-%m-%d";
    const timezone = "Asia/Manila";
    switch (range) {
      case 'today': groupByFormat = "%Y-%m-%d %H:00"; break; 
      case 'week': case 'month': groupByFormat = "%Y-%m-%d"; break; 
      case 'all': default: groupByFormat = "%Y-%m"; break; 
    }
    const salesTrend = await Sale.aggregate([
      { $match: saleDateFilter },
      { $group: {
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


// --- NEW FUNCTION: Get filtered Returns Report ---
const getReturnsReport = async (req, res) => {
  try {
    const { startDate, endDate, productId, customerId, supplierId, returnType } = req.query;

    let customerReturns = [];
    let supplierReturns = [];

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    // --- 1. Fetch Customer Returns if needed ---
    if (returnType === 'all' || returnType === 'customer') {
      const customerReturnFilter = {};
      
      if (startDate && endDate) {
        customerReturnFilter.createdAt = { $gte: start, $lte: end };
      }
      if (productId && mongoose.Types.ObjectId.isValid(productId)) {
        customerReturnFilter['itemsReturned.product'] = new mongoose.Types.ObjectId(productId);
      }
      if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
        const sales = await Sale.find({ customer: new mongoose.Types.ObjectId(customerId) }).select('_id');
        const saleIds = sales.map(s => s._id);
        customerReturnFilter.originalSale = { $in: saleIds };
      }
      // supplierId is irrelevant for customer returns, so we don't filter

      customerReturns = await Return.find(customerReturnFilter)
        .sort({ createdAt: -1 })
        .populate('originalSale', '_id')
        .populate('recordedBy', 'fullName')
        .populate('itemsReturned.product', 'name itemCode')
        .populate({
          path: 'originalSale',
          select: '_id',
          populate: { path: 'customer', select: 'name' }
        });
    }

    // --- 2. Fetch Supplier Returns if needed ---
    if ((returnType === 'all' || returnType === 'supplier') && !customerId) { // customerId is irrelevant for supplier returns
      const supplierReturnFilter = {};

      if (startDate && endDate) {
        supplierReturnFilter.returnDate = { $gte: start, $lte: end };
      }
      if (productId && mongoose.Types.ObjectId.isValid(productId)) {
        supplierReturnFilter['productsReturned.product'] = new mongoose.Types.ObjectId(productId);
      }
      if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
        supplierReturnFilter.supplier = new mongoose.Types.ObjectId(supplierId);
      }

      supplierReturns = await SupplierReturn.find(supplierReturnFilter)
        .sort({ returnDate: -1 })
        .populate('supplier', 'name')
        .populate('recordedBy', 'fullName')
        .populate('productsReturned.product', 'name itemCode');
    }

    // --- 3. Send both arrays ---
    res.json({ customerReturns, supplierReturns });

  } catch (error) {
    console.error("Error fetching returns report:", error);
    res.status(500).json({ message: 'Server Error fetching returns report.', error: error.message });
  }
};
// --- END NEW FUNCTION ---


module.exports = {
    getDashboardSummary,
    getSalesReport,
    getLowStockProducts,
    getSalesTrend,
    getRecentActivities,
    getPendingPurchaseOrders,
    // --- EXPORT NEW FUNCTION ---
    getReturnsReport
};