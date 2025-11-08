// server/routes/movementRoutes.js
const express = require('express');
const router = express.Router();
const { getProductMovements } = require('../controllers/movementController');
// --- UPDATED: Import 'checkPermission' ---
const { protect, checkPermission } = require('../middleware/authMiddleware');

// 'canViewInventory' (Default: Admin, Salesperson)
router.get('/:productId', protect, checkPermission('canViewInventory'), getProductMovements);

module.exports = router;