// server/routes/motorcycleRoutes.js
const express = require('express');
const router = express.Router();
const {
  createMotorcycle,
  getMotorcyclesByCustomer,
  updateMotorcycle,
  deleteMotorcycle,
} = require('../controllers/motorcycleController');
// --- UPDATED: Import 'checkPermission' ---
const { protect, checkPermission } = require('../middleware/authMiddleware');

// All motorcycle routes require 'canManageMotorcycles' (Default: Admin, Salesperson)
const canManageMotorcycles = checkPermission('canManageMotorcycles');

router.route('/')
  .post(protect, canManageMotorcycles, createMotorcycle);

router.route('/:id')
  .put(protect, canManageMotorcycles, updateMotorcycle)
  .delete(protect, canManageMotorcycles, deleteMotorcycle);

router.route('/customer/:customerId')
  .get(protect, canManageMotorcycles, getMotorcyclesByCustomer);

module.exports = router;