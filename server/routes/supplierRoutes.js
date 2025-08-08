// server/routes/supplierRoutes.js
const express = require('express');
const router = express.Router();
const { getSuppliers, createSupplier, updateSupplier, deleteSupplier } = require('../controllers/supplierController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes are now protected
router.route('/')
    .get(protect, getSuppliers)
    .post(protect, authorize('Owner'), createSupplier); // Only Owner can create

router.route('/:id')
    .put(protect, authorize('Owner'), updateSupplier) // Only Owner can update
    .delete(protect, authorize('Owner'), deleteSupplier); // Only Owner can delete

module.exports = router;