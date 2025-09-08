// server/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
// --- MODIFIED START ---
const { getDashboardSummary, getSalesReport, getLowStockProducts, getSalesTrend, getRecentTransactions, getPendingPurchaseOrders } = require('../controllers/reportController');
// --- MODIFIED END ---


// We can add role-based protection here later
router.get('/summary', getDashboardSummary);
router.get('/sales', getSalesReport);
router.get('/low-stock', getLowStockProducts);
router.get('/sales-trend', getSalesTrend);
router.get('/recent-transactions', getRecentTransactions);
// --- ADDED START ---
router.get('/pending-pos', getPendingPurchaseOrders);
// --- ADDED END ---


module.exports = router;