// server/routes/motorcycleRoutes.js
const express = require('express');
const router = express.Router();
const {
  createMotorcycle,
  getMotorcyclesByCustomer,
  updateMotorcycle,
  deleteMotorcycle,
} = require('../controllers/motorcycleController');
const { protect } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);

router.route('/').post(createMotorcycle);

router.route('/:id')
  .put(updateMotorcycle)
  .delete(deleteMotorcycle);

router.route('/customer/:customerId').get(getMotorcyclesByCustomer);

module.exports = router;