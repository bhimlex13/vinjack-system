// server/routes/purchaseOrderRoutes.js
const express = require('express');
const router = express.Router();
const { 
  createPurchaseOrder, 
  getAllPurchaseOrders, 
  getPurchaseOrderById, 
  receivePurchaseOrder,
  cancelPurchaseOrder
} = require('../controllers/purchaseOrderController');

// We must use 'authorize' here, not 'admin'
const { protect, authorize } = require('../middleware/authMiddleware');

// Using the correct authorize('Owner', 'Admin') middleware
router.route('/')
  .post(protect, authorize('Owner', 'Admin'), createPurchaseOrder)
  .get(protect, authorize('Owner', 'Admin'), getAllPurchaseOrders);

router.route('/:id')
  .get(protect, authorize('Owner', 'Admin'), getPurchaseOrderById);

router.post('/:id/receive', protect, authorize('Owner', 'Admin'), receivePurchaseOrder);

router.post('/:id/cancel', protect, authorize('Owner', 'Admin'), cancelPurchaseOrder);

module.exports = router;