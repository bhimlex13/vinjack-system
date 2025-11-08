// server/routes/customerRoutes.js
const express = require('express');
const router = express.Router();
const {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
} = require('../controllers/customerController');
// --- UPDATED: Import 'checkPermission' ---
const { protect, checkPermission } = require('../middleware/authMiddleware');

// All customer routes require 'canManageCustomers' (Default: Admin, Salesperson)
const canManageCustomers = checkPermission('canManageCustomers');

router.route('/')
  .post(protect, canManageCustomers, createCustomer)
  .get(protect, canManageCustomers, getAllCustomers);

router.route('/:id')
  .get(protect, canManageCustomers, getCustomerById)
  .put(protect, canManageCustomers, updateCustomer)
  .delete(protect, canManageCustomers, deleteCustomer);

module.exports = router;