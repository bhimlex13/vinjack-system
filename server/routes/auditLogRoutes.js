// server/routes/auditLogRoutes.js
const express = require('express');
const router = express.Router();
const { getLogs } = require('../controllers/auditLogController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/').get(protect, authorize('Super Admin'), getLogs); // <-- UPDATED

module.exports = router;