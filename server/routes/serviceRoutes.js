// server/routes/serviceRoutes.js
const express = require('express');
const router = express.Router();
const { getServices, createService, updateService, deleteService } = require('../controllers/serviceController');

// Import the correct 'authorize' function instead of 'admin'
const { protect, authorize } = require('../middleware/authMiddleware');

// Any logged-in user can get the list of services for the POS
router.get('/', protect, getServices);

// Only users with the role 'Owner' or 'Admin' can create, update, or delete services
router.post('/', protect, authorize('Owner', 'Admin'), createService);
router.put('/:id', protect, authorize('Owner', 'Admin'), updateService);
router.delete('/:id', protect, authorize('Owner', 'Admin'), deleteService);

module.exports = router;