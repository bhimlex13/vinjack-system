// server/routes/adjustmentRoutes.js
const express = require('express');
const router = express.Router();
const { createStockAdjustment } = require('../controllers/adjustmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// This action should be restricted to administrators
router.post('/', protect, authorize('Owner', 'Admin'), createStockAdjustment);

module.exports = router;