// server/routes/brandRoutes.js
const express = require('express');
const router = express.Router();
const { getBrands, createBrand, updateBrand, deleteBrand } = require('../controllers/brandController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getBrands) // All users can get brands
    .post(protect, authorize('Owner'), createBrand); // Only owner can create

router.route('/:id')
    .put(protect, authorize('Owner'), updateBrand)
    .delete(protect, authorize('Owner'), deleteBrand);

module.exports = router;