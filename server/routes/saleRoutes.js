// server/routes/saleRoutes.js
const express = require('express');
const router = express.Router();
const { createSale } = require('../controllers/saleController');
const { protect } = require('../middleware/authMiddleware');

// We'll protect this route later to ensure only logged-in users can create sales
router.route('/').post(protect, createSale);

module.exports = router;