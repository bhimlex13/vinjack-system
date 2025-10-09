// server/routes/purchaseOrderRoutes.js
const express = require('express');
const router = express.Router();
// --- MODIFIED: Import the new middleware with the error handler ---
const uploadWithErrorHandler = require('../middleware/uploadMiddleware'); 
const { 
  createPurchaseOrder, 
  getAllPurchaseOrders, 
  getPurchaseOrderById, 
  receivePurchaseOrder,
  cancelPurchaseOrder,
  updatePurchaseOrder,
  getPurchaseOrderByToken,
  updateBySupplier,
  approveSupplierChanges
} = require('../controllers/purchaseOrderController');

const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes for supplier interaction
router.route('/supplier/:token')
  .get(getPurchaseOrderByToken)
  .put(updateBySupplier);

// Protected route for the buyer to approve changes
router.post('/:id/approve', protect, authorize('Owner', 'Admin'), approveSupplierChanges);


// Existing Routes
router.route('/')
  .post(protect, authorize('Owner', 'Admin'), createPurchaseOrder)
  .get(protect, authorize('Owner', 'Admin'), getAllPurchaseOrders);

router.route('/:id')
  .get(protect, authorize('Owner', 'Admin'), getPurchaseOrderById)
  .put(protect, authorize('Owner', 'Admin'), updatePurchaseOrder);

// --- MODIFIED: The 'uploadWithErrorHandler' middleware is now used here ---
router.post('/:id/receive', protect, authorize('Owner', 'Admin'), uploadWithErrorHandler, receivePurchaseOrder);

router.post('/:id/cancel', protect, authorize('Owner', 'Admin'), cancelPurchaseOrder);

module.exports = router;