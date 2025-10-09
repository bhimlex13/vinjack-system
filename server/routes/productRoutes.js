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
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getProducts)
  .post(protect, authorize('Owner', 'Clerk'), createProduct);

router.route('/:id')
  .put(protect, authorize('Owner'), updateProduct)
  .delete(protect, authorize('Owner'), deleteProduct);

router.route('/low-stock').get(protect, getLowStockProducts);

router.route('/by-supplier/:supplierId')
  .get(protect, getProductsBySupplier);


module.exports = router;