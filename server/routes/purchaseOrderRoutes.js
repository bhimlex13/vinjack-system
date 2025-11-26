// server/routes/purchaseOrderRoutes.js
const express = require('express');
const router = express.Router();
const { 
  createPurchaseOrder, 
  getAllPurchaseOrders, 
  getPurchaseOrderById, 
  receivePurchaseOrder,
  cancelPurchaseOrder,
  updatePurchaseOrder,
  getPurchaseOrderByToken,
  updateBySupplier,
  approveSupplierChanges,
  uploadSignedAgreement,
  uploadCountersignedAgreement // --- NEW IMPORT ---
} = require('../controllers/purchaseOrderController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

// Public routes for supplier interaction
router.route('/supplier/:token')
  .get(getPurchaseOrderByToken)
  .put(updateBySupplier);

const canManagePOs = checkPermission('canManagePurchaseOrders');

// Protected route for the buyer to approve changes
router.post('/:id/approve', protect, canManagePOs, approveSupplierChanges);

// Route for uploading signed consignment agreement (Supplier Signed)
router.post('/:id/upload-agreement', protect, canManagePOs, uploadSignedAgreement);

// --- NEW: Route for Countersigned Agreement (Owner Signed) ---
router.post('/:id/upload-countersigned', protect, canManagePOs, uploadCountersignedAgreement);
// -------------------------------------------------------------

// Existing Routes
router.route('/')
  .post(protect, canManagePOs, createPurchaseOrder)
  .get(protect, canManagePOs, getAllPurchaseOrders);

router.route('/:id')
  .get(protect, canManagePOs, getPurchaseOrderById)
  .put(protect, canManagePOs, updatePurchaseOrder);

router.post('/:id/receive', protect, canManagePOs, receivePurchaseOrder);

router.post('/:id/cancel', protect, canManagePOs, cancelPurchaseOrder);

module.exports = router;