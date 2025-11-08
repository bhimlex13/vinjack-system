// server/routes/deliveryRoutes.js
const express = require('express');
const router = express.Router();
// --- UPDATED: Import 'checkPermission' ---
const { protect, checkPermission } = require('../middleware/authMiddleware');
const { createDelivery, getDeliveries } = require('../controllers/deliveryController');

router.route('/')
    // 'canViewSuppliers' (Default: Admin)
    .get(protect, checkPermission('canViewSuppliers'), getDeliveries)
    // 'canManageDeliveries' (Default: Admin)
    .post(protect, checkPermission('canManageDeliveries'), createDelivery);

module.exports = router;