// server/routes/movementRoutes.js
const express = require('express');
const router = express.Router();
const { getProductMovements } = require('../controllers/movementController');
// --- ADDED authorize middleware ---
const { protect, authorize } = require('../middleware/authMiddleware');

// --- UPDATED: Restricted access to Owner and Admin ---
router.get('/:productId', protect, authorize('Owner', 'Admin'), getProductMovements);

module.exports = router;