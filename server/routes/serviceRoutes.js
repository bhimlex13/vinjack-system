// server/routes/serviceRoutes.js
const express = require('express');
const router = express.Router();
const { getServices, createService, updateService, deleteService } = require('../controllers/serviceController');

// --- UPDATED: Import 'checkPermission' ---
const { protect, checkPermission } = require('../middleware/authMiddleware');

// 'canManageSales' (Default: Admin, Salesperson) - Anyone who can make a sale can get the list
router.get('/', protect, checkPermission('canManageSales'), getServices);

// 'canManageServices' (Default: Admin) - Only admins can create, update, or delete
router.post('/', protect, checkPermission('canManageServices'), createService);
router.put('/:id', protect, checkPermission('canManageServices'), updateService);
router.delete('/:id', protect, checkPermission('canManageServices'), deleteService);

module.exports = router;