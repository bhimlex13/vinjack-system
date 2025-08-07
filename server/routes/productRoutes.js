const express = require('express');
const router = express.Router();
const {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware'); // Import the middleware

// --- Apply Protection to Routes ---

// All logged-in users can get the product list. Only Owner/Clerk can create.
router.route('/')
  .get(protect, getProducts)
  .post(protect, authorize('Owner', 'Clerk'), createProduct);

// Only an 'Owner' can update or delete a product
router.route('/:id')
  .put(protect, authorize('Owner'), updateProduct)
  .delete(protect, authorize('Owner'), deleteProduct);

// All logged-in users can view the low stock alerts
router.route('/low-stock').get(protect, getLowStockProducts);

module.exports = router;