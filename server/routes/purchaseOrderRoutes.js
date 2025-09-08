// server/routes/purchaseOrderRoutes.js
const express = require('express');
const router = express.Router();
const {
  createPurchaseOrder,
  getAllPurchaseOrders,
  getPurchaseOrderById,
  receivePurchaseOrder, // <-- ADD THIS
} = require('../controllers/purchaseOrderController');

// We will add auth middleware here later
// const { protect, admin } = require('../middleware/authMiddleware');

// Routes
router.route('/').post(createPurchaseOrder).get(getAllPurchaseOrders);
router.route('/:id').get(getPurchaseOrderById);
router.route('/:id/receive').post(receivePurchaseOrder); // <-- ADD THIS LINE

module.exports = router;