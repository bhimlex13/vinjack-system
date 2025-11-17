// server/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const {
    getDashboardSummary,
    getSalesReport,
    getLowStockProducts,
    getSalesTrend,
    getRecentActivities,
    getPendingPurchaseOrders,
    // --- IMPORT NEW FUNCTION ---
    getReturnsReport
} = require('../controllers/reportController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

// Dashboard routes
const canViewDashboard = checkPermission('canViewDashboard'); 
router.get('/summary', protect, canViewDashboard, getDashboardSummary);
router.get('/low-stock', protect, canViewDashboard, getLowStockProducts);
router.get('/sales-trend', protect, canViewDashboard, getSalesTrend);
router.get('/recent-activities', protect, canViewDashboard, getRecentActivities);
router.get('/pending-pos', protect, canViewDashboard, getPendingPurchaseOrders);

// --- Dedicated Report Page Routes ---
const canViewReports = checkPermission('canViewReports');
router.get('/sales', protect, canViewReports, getSalesReport);

// --- NEW ROUTE FOR RETURNS REPORT ---
router.get('/returns', protect, canViewReports, getReturnsReport);
// --- END NEW ROUTE ---

module.exports = router;