// server/routes/saleRoutes.js
const express = require('express');
const router = express.Router();
// --- MODIFIED: Import the new searchSales function ---
const { createSale, getAllSales, getSaleById, searchSales } = require('../controllers/saleController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize('Owner', 'Admin', 'Clerk'), createSale)
    .get(protect, authorize('Owner', 'Admin'), getAllSales);

// --- ADDED: Route for searching sales, placed before the '/:id' route ---
router.route('/search')
    .get(protect, authorize('Owner', 'Admin', 'Clerk'), searchSales);

// This route gets a single sale by its ID
router.route('/:id')
    .get(protect, authorize('Owner', 'Admin', 'Clerk'), getSaleById);

module.exports = router;