// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  loginUser,
  getAllUsers,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

// --- Public Routes ---
router.post('/register', registerUser);
router.post('/login', loginUser);

// --- Admin Routes (Protected and for Owner only) ---
router.route('/')
  .get(protect, authorize('Owner'), getAllUsers);

router.route('/:id')
  .put(protect, authorize('Owner'), updateUser)
  .delete(protect, authorize('Owner'), deleteUser);

module.exports = router;
