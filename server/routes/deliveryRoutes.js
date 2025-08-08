// server/routes/deliveryRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');

// This line imports the functions from your controller.
const { createDelivery, getDeliveries } = require('../controllers/deliveryController');

// All routes are now protected
router.route('/')
    .get(protect, getDeliveries)
    .post(protect, authorize('Owner', 'Clerk'), createDelivery); // Owner or Clerk can record deliveries

module.exports = router;
