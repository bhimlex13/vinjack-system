// server/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getCategories) // All users can get categories
    .post(protect, authorize('Super Admin'), createCategory); // <-- UPDATED

router.route('/:id')
    .put(protect, authorize('Super Admin'), updateCategory) // <-- UPDATED
    .delete(protect, authorize('Super Admin'), deleteCategory); // <-- UPDATED

module.exports = router;