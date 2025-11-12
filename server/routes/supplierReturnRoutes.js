// server/routes/supplierReturnRoutes.js
const express = require('express');
const router = express.Router();
const {
  createSupplierReturn,
  getSupplierReturns,
} = require('../controllers/supplierReturnController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

// Protect all supplier return routes
// Only users with 'canManageSuppliers' permission can access
router.use(protect);
router.use(checkPermission('canManageSuppliers'));

router.route('/')
  .post(createSupplierReturn)
  .get(getSupplierReturns);

module.exports = router;