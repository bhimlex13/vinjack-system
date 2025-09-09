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
const { protect, admin } = require('../middleware/authMiddleware'); // Assuming you have role middleware

// Protect all routes
router.use(protect);

router.route('/')
  .post(createCustomer)
  .get(getAllCustomers);

router.route('/:id')
  .get(getCustomerById)
  .put(updateCustomer)
  .delete(deleteCustomer); // Consider restricting delete to admin/owner

module.exports = router;