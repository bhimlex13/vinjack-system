// server/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

// Route for /api/products
router.route('/').get(getProducts).post(createProduct);

// Route for /api/products/:id
router.route('/:id').put(updateProduct).delete(deleteProduct);

module.exports = router;