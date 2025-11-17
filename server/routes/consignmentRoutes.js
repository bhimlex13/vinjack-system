// server/routes/consignmentRoutes.js
const express = require('express');
const router = express.Router();
const {
  getOwedPayables,
  markPayableAsPaid,
} = require('../controllers/consignmentController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

// Protect all consignment routes
// Only users with 'canManageSuppliers' permission can access
router.use(protect);
router.use(checkPermission('canManageSuppliers'));

// Get all payables with 'Owed' status
router.route('/owed').get(getOwedPayables);

// Mark a specific payable as 'Paid'
router.route('/:id/pay').put(markPayableAsPaid);

module.exports = router;