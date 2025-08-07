// server/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('../controllers/reportController');

// We can add role-based protection here later
router.get('/summary', getDashboardSummary);

module.exports = router;