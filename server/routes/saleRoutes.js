// server/routes/saleRoutes.js
const express = require('express');
const router = express.Router();
const { createSale, getAllSales } = require('../controllers/saleController');
// --- ADDED authorize middleware ---
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    // --- UPDATED: Creating a sale is a staff-level action ---
    .post(protect, authorize('Owner', 'Admin', 'Clerk'), createSale)
    // --- UPDATED: Viewing all sales is a management-level action ---
    .get(protect, authorize('Owner', 'Admin'), getAllSales);

module.exports = router;