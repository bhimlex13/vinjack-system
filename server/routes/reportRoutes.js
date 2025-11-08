// server/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const {
    getDashboardSummary,
    getSalesReport,
    getLowStockProducts,
    getSalesTrend,
    getRecentActivities,
    getPendingPurchaseOrders
} = require('../controllers/reportController');
// --- UPDATED: Import 'checkPermission' ---
const { protect, checkPermission } = require('../middleware/authMiddleware');

// These routes feed the dashboard widgets
// 'canViewDashboard' (Default: Admin, Salesperson)
const canViewDashboard = checkPermission('canViewDashboard'); 
router.get('/summary', protect, canViewDashboard, getDashboardSummary);
router.get('/low-stock', protect, canViewDashboard, getLowStockProducts);
router.get('/sales-trend', protect, canViewDashboard, getSalesTrend);
router.get('/recent-activities', protect, canViewDashboard, getRecentActivities);
router.get('/pending-pos', protect, canViewDashboard, getPendingPurchaseOrders);

// This route feeds the dedicated, detailed Sales Report page
// 'canViewReports' (Default: Admin)
router.get('/sales', protect, checkPermission('canViewReports'), getSalesReport);

module.exports = router;