// server/routes/movementRoutes.js
const express = require('express');
const router = express.Router();
const { getProductMovements } = require('../controllers/movementController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:productId', protect, getProductMovements);

module.exports = router;