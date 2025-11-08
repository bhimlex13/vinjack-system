// server/routes/returnRoutes.js
const express = require('express');
const router = express.Router();
const { createReturn, getAllReturns, getReturnById, getReturnsBySale } = require('../controllers/returnController');
// --- UPDATED: Import 'checkPermission' ---
const { protect, checkPermission } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);

// --- UPDATED: All return routes now require the 'canManageReturns' permission ---
const canManageReturns = checkPermission('canManageReturns');

router.route('/')
  .post(canManageReturns, createReturn)
  .get(canManageReturns, getAllReturns);

router.route('/:id')
  .get(canManageReturns, getReturnById);

router.route('/by-sale/:saleId')
  .get(canManageReturns, getReturnsBySale);

module.exports = router;