// server/routes/supplierRoutes.js
const express = require('express');
const router = express.Router();
const { getSuppliers, createSupplier, updateSupplier, deleteSupplier } = require('../controllers/supplierController');
// --- UPDATED: Import 'checkPermission' ---
const { protect, authorize, checkPermission } = require('../middleware/authMiddleware');

router.route('/')
    // 'canViewSuppliers' (Default: Admin)
    .get(protect, checkPermission('canViewSuppliers'), getSuppliers)
    // 'canManageSuppliers' (Default: Admin)
    .post(protect, checkPermission('canManageSuppliers'), createSupplier);

router.route('/:id')
    // 'canManageSuppliers' (Default: Admin)
    .put(protect, checkPermission('canManageSuppliers'), updateSupplier)
    // 'canManageSuppliers' (Default: Admin)
    // We keep 'authorize' here as a safeguard to ensure only Super Admin can delete
    .delete(protect, authorize('Super Admin'), deleteSupplier);

module.exports = router;