// server/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  getProductsBySupplier,
  recalculateAllProductStatuses,
} = require('../controllers/productController');
// --- UPDATED: Import 'checkPermission' ---
const { protect, authorize, checkPermission } = require('../middleware/authMiddleware');

router.route('/')
  // 'canViewInventory' (Default: Admin, Salesperson)
  .get(protect, checkPermission('canViewInventory'), getProducts) 
  // 'canManageInventory' (Default: Admin)
  .post(protect, checkPermission('canManageInventory'), createProduct); 

router.route('/:id')
  // 'canManageInventory' (Default: Admin)
  .put(protect, checkPermission('canManageInventory'), updateProduct) 
  // 'canManageInventory' (Default: Admin)
  .delete(protect, checkPermission('canManageInventory'), deleteProduct); 

// 'canViewInventory' (Default: Admin, Salesperson)
router.route('/low-stock')
  .get(protect, checkPermission('canViewInventory'), getLowStockProducts); 

// 'canViewInventory' (Default: Admin, Salesperson)
router.route('/by-supplier/:supplierId')
  .get(protect, checkPermission('canViewInventory'), getProductsBySupplier);

// This is a Super Admin only system task, so 'authorize' is still best
router.route('/recalculate-statuses')
  .post(protect, authorize('Super Admin'), recalculateAllProductStatuses); 

module.exports = router;