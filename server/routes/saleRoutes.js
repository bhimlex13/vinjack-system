// server/routes/saleRoutes.js
const express = require('express');
const router = express.Router();
// --- MODIFIED: Import new controller, remove old one ---
const {
  createSale,
  getAllSales,
  getSaleById,
  searchSales,
  saveReceiptString // <-- NEW
} = require('../controllers/saleController');
const { protect, authorize } = require('../middleware/authMiddleware');
// --- REMOVED: uploadMiddleware is no longer needed for sales ---
// const uploadMiddleware = require('../middleware/uploadMiddleware');

router.route('/')
    .post(protect, authorize('Owner', 'Admin', 'Clerk'), createSale)
    .get(protect, authorize('Owner', 'Admin'), getAllSales);

router.route('/search')
    .get(protect, authorize('Owner', 'Admin', 'Clerk'), searchSales);

// --- NEW: Route for saving the Base64 receipt string ---
// This route expects a JSON body with { receiptImageString: "data:image/..." }
router.route('/:id/save-receipt-string')
    .post(
        protect,
        authorize('Owner', 'Admin', 'Clerk'),
        saveReceiptString // Does NOT use multer middleware
    );
// --- END NEW ---

// This route gets a single sale by its ID (must be last with :id)
router.route('/:id')
    .get(protect, authorize('Owner', 'Admin', 'Clerk'), getSaleById);

module.exports = router;