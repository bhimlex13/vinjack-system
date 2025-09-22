// server/routes/returnRoutes.js
const express = require('express');
const router = express.Router();
const { createReturn, getAllReturns, getReturnById } = require('../controllers/returnController'); // <-- 1. IMPORT THE NEW FUNCTION
const { protect } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);

router.route('/')
  .post(createReturn)
  .get(getAllReturns);

// --- 2. ADD THE NEW ROUTE FOR FETCHING A SINGLE RETURN ---
router.route('/:id')
  .get(getReturnById);

module.exports = router;