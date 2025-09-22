// server/routes/purchaseOrderRoutes.js
const express = require('express');
const router = express.Router();
const { 
  createPurchaseOrder, 
  getAllPurchaseOrders, 
  getPurchaseOrderById, 
  receivePurchaseOrder,
  cancelPurchaseOrder,
  updatePurchaseOrder // 1. IMPORT THE NEW FUNCTION
} = require('../controllers/purchaseOrderController');

const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, authorize('Owner', 'Admin'), createPurchaseOrder)
  .get(protect, authorize('Owner', 'Admin'), getAllPurchaseOrders);

router.route('/:id')
  .get(protect, authorize('Owner', 'Admin'), getPurchaseOrderById)
  .put(protect, authorize('Owner', 'Admin'), updatePurchaseOrder); // 2. ADD THE PUT ROUTE

router.post('/:id/receive', protect, authorize('Owner', 'Admin'), receivePurchaseOrder);

router.post('/:id/cancel', protect, authorize('Owner', 'Admin'), cancelPurchaseOrder);

module.exports = router;