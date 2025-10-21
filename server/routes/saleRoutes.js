// server/routes/saleRoutes.js
const express = require('express');
const router = express.Router();
// --- MODIFIED: Import uploadMiddleware and the new controller function ---
const {
  createSale,
  getAllSales,
  getSaleById,
  searchSales,
  uploadReceiptImage // <-- NEW
} = require('../controllers/saleController');
const { protect, authorize } = require('../middleware/authMiddleware');
// --- NEW: Import upload middleware ---
const uploadMiddleware = require('../middleware/uploadMiddleware');

router.route('/')
    .post(protect, authorize('Owner', 'Admin', 'Clerk'), createSale)
    .get(protect, authorize('Owner', 'Admin'), getAllSales);

router.route('/search')
    .get(protect, authorize('Owner', 'Admin', 'Clerk'), searchSales);

// --- NEW: Route for uploading customer receipt image ---
// Uses uploadMiddleware to handle the file named 'receiptImage'
router.route('/:id/upload-receipt')
    .post(
        protect,
        authorize('Owner', 'Admin', 'Clerk'),
        uploadMiddleware, // Handles single file upload named 'receiptImage'
        uploadReceiptImage
    );
// --- END NEW ---

// This route gets a single sale by its ID (must be last with :id)
router.route('/:id')
    .get(protect, authorize('Owner', 'Admin', 'Clerk'), getSaleById);

module.exports = router;