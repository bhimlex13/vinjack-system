// server/routes/saleRoutes.js
const express = require('express');
const router = express.Router();
const {
  createSale,
  getAllSales,
  getSaleById,
  searchSales,
  saveReceiptString
} = require('../controllers/saleController');
// --- UPDATED: Import 'checkPermission' ---
const { protect, authorize, checkPermission } = require('../middleware/authMiddleware');

router.route('/')
    // 'canManageSales' (Default: Admin, Salesperson)
    .post(protect, checkPermission('canManageSales'), createSale)
    // 'canViewReports' (Default: Admin)
    .get(protect, checkPermission('canViewReports'), getAllSales);

// 'canManageSales' (Default: Admin, Salesperson)
router.route('/search')
    .get(protect, checkPermission('canManageSales'), searchSales);

// 'canManageSales' (Default: Admin, Salesperson)
router.route('/:id/save-receipt-string')
    .post(
        protect,
        checkPermission('canManageSales'),
        saveReceiptString
    );

// 'canManageSales' (Default: Admin, Salesperson)
router.route('/:id')
    .get(protect, checkPermission('canManageSales'), getSaleById);

module.exports = router;