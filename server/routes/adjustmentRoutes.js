// server/routes/adjustmentRoutes.js
const express = require('express');
const router = express.Router();
const { createStockAdjustment } = require('../controllers/adjustmentController');
// --- UPDATED: Import 'checkPermission' ---
const { protect, checkPermission } = require('../middleware/authMiddleware');

// 'canAdjustStock' (Default: Admin)
router.post('/', protect, checkPermission('canAdjustStock'), createStockAdjustment);

module.exports = router;