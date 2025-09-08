// server/routes/deliveryRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { createDelivery, getDeliveries } = require('../controllers/deliveryController');

router.route('/')
    // --- UPDATED: Viewing all deliveries is a management-level action ---
    .get(protect, authorize('Owner', 'Admin'), getDeliveries)
    // --- UPDATED: Expanded to include 'Admin' for consistency ---
    .post(protect, authorize('Owner', 'Admin', 'Clerk'), createDelivery);

module.exports = router;