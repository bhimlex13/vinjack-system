// server/routes/consignmentRoutes.js
const express = require('express');
const router = express.Router();
const {
  getOwedPayables,
  markPayableAsPaid,
  // --- IMPORT NEW FUNCTION ---
  getPayoutHistory
} = require('../controllers/consignmentController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

// Protect all consignment routes
router.use(protect);
router.use(checkPermission('canManageSuppliers'));

// Get all payables with 'Owed' status
router.route('/owed').get(getOwedPayables);

// --- NEW ROUTE for 'Paid' history ---
router.route('/history').get(getPayoutHistory);
// --- END NEW ROUTE ---

// Mark a specific payable as 'Paid'
router.route('/:id/pay').put(markPayableAsPaid);

module.exports = router;