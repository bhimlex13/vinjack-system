// server/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
} = require('../controllers/productController');

// Route for /api/products
router.route('/').get(getProducts).post(createProduct);

// Route for /api/products/:id
router.route('/:id').put(updateProduct).delete(deleteProduct);

// Add the new route for low stock items
router.route('/low-stock').get(getLowStockProducts); 

module.exports = router;