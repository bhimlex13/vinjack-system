// server/routes/returnRoutes.js
const express = require('express');
const router = express.Router();
// --- MODIFIED: Import getReturnsBySale ---
const { createReturn, getAllReturns, getReturnById, getReturnsBySale } = require('../controllers/returnController');
const { protect } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);

router.route('/')
  .post(createReturn)
  .get(getAllReturns);

// Existing route for getting a specific return by its own ID
router.route('/:id')
  .get(getReturnById);

// --- NEW ROUTE: Get returns by original Sale ID ---
router.route('/by-sale/:saleId')
  .get(getReturnsBySale);
// --- END NEW ROUTE ---

module.exports = router;