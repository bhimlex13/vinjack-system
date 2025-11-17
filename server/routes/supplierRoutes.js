// server/routes/supplierRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getSuppliers, 
  createSupplier, 
  updateSupplier, 
  deleteSupplier,
  getSupplierProductCatalog,
  updateSupplierProductCatalog,
  // --- IMPORT NEW FUNCTION ---
  getSupplierOrderHistory 
} = require('../controllers/supplierController');
const { protect, authorize, checkPermission } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, checkPermission('canViewSuppliers'), getSuppliers)
    .post(protect, checkPermission('canManageSuppliers'), createSupplier);

// --- NEW ROUTE FOR ORDER HISTORY ---
// Place this *before* the '/:id' route to avoid conflicts
router.route('/:id/history')
  .get(protect, checkPermission('canViewSuppliers'), getSupplierOrderHistory);
// --- END NEW ROUTE ---

router.route('/:id/products')
  .get(protect, checkPermission('canViewSuppliers'), getSupplierProductCatalog)
  .put(protect, checkPermission('canManageSuppliers'), updateSupplierProductCatalog);

router.route('/:id')
    .put(protect, checkPermission('canManageSuppliers'), updateSupplier)
    .delete(protect, authorize('Super Admin'), deleteSupplier);

module.exports = router;