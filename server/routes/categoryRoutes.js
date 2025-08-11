// server/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getCategories) // All users can get categories (for dropdowns)
    .post(protect, authorize('Owner'), createCategory); // Only owner can create

router.route('/:id')
    .put(protect, authorize('Owner'), updateCategory)
    .delete(protect, authorize('Owner'), deleteCategory);

module.exports = router;