// server/routes/returnRoutes.js
const express = require('express');
const router = express.Router();
const { createReturn, getAllReturns } = require('../controllers/returnController');
const { protect } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);

router.route('/')
  .post(createReturn)
  .get(getAllReturns);

module.exports = router;