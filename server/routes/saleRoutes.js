// server/routes/saleRoutes.js
const express = require('express');
const router = express.Router();
// --- MODIFIED: Import the getSaleById function ---
const { createSale, getAllSales, getSaleById } = require('../controllers/saleController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize('Owner', 'Admin', 'Clerk'), createSale)
    .get(protect, authorize('Owner', 'Admin'), getAllSales);

// --- ADDED: Route to get a single sale by its ID ---
// This is necessary for the sales return feature.
// A Clerk needs access to this to process a return.
router.route('/:id')
    .get(protect, authorize('Owner', 'Admin', 'Clerk'), getSaleById);

module.exports = router;