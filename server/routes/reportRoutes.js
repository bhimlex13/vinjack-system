// server/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const { 
    getDashboardSummary, 
    getSalesReport, 
    getLowStockProducts, 
    getSalesTrend, 
    getRecentTransactions, 
    getPendingPurchaseOrders 
} = require('../controllers/reportController');
// --- ADDED middleware ---
const { protect, authorize } = require('../middleware/authMiddleware');

// --- UPDATED: All routes are now protected and restricted to Owner/Admin ---
const adminOnly = [protect, authorize('Owner', 'Admin')];

router.get('/summary', adminOnly, getDashboardSummary);
router.get('/sales', adminOnly, getSalesReport);
router.get('/low-stock', adminOnly, getLowStockProducts);
router.get('/sales-trend', adminOnly, getSalesTrend);
router.get('/recent-transactions', adminOnly, getRecentTransactions);
router.get('/pending-pos', adminOnly, getPendingPurchaseOrders);

module.exports = router;