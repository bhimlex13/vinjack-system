// server/routes/auditLogRoutes.js
const express = require('express');
const router = express.Router();
const { getLogs } = require('../controllers/auditLogController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Only the Owner can view the audit logs
router.route('/').get(protect, authorize('Owner'), getLogs);

module.exports = router;