// server/routes/brandRoutes.js
const express = require('express');
const router = express.Router();
const { getBrands, createBrand, updateBrand, deleteBrand } = require('../controllers/brandController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getBrands) // All users can get brands
    .post(protect, authorize('Super Admin'), createBrand); // <-- UPDATED

router.route('/:id')
    .put(protect, authorize('Super Admin'), updateBrand) // <-- UPDATED
    .delete(protect, authorize('Super Admin'), deleteBrand); // <-- UPDATED

module.exports = router;