// server/routes/saleRoutes.js
const express = require('express');
const router = express.Router();
// MODIFIED: Import the new getAllSales function
const { createSale, getAllSales } = require('../controllers/saleController');
const { protect } = require('../middleware/authMiddleware');

// MODIFIED: This route now handles both GET and POST requests
router.route('/')
    .post(protect, createSale)
    .get(protect, getAllSales);

module.exports = router;