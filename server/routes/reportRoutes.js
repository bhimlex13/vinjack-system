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
const { protect, authorize } = require('../middleware/authMiddleware');

// --- MODIFIED: All dashboard/report routes now accessible to all roles ---
// The frontend will still hide sensitive filters from non-Owners.
// This aligns with the thesis requirement for read-only dashboard access for all roles.
const allRoles = [protect, authorize('Owner', 'Admin', 'Clerk', 'Mechanic')];

router.get('/summary', allRoles, getDashboardSummary);
router.get('/sales', allRoles, getSalesReport);
router.get('/low-stock', allRoles, getLowStockProducts);
router.get('/sales-trend', allRoles, getSalesTrend);
router.get('/recent-activities', allRoles, getRecentActivities);
router.get('/pending-pos', allRoles, getPendingPurchaseOrders);

module.exports = router;