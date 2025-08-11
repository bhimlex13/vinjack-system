// server/controllers/userController.js
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Register a new user for approval
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    // Now expects email from the public registration form
    const { fullName, username, email, password } = req.body;

    // Basic validation
    if (!fullName || !username || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    // Check if username or email already exists
    const userExists = await User.findOne({ $or: [{ username }, { email }] });
    if (userExists) {
      return res.status(400).json({ message: 'Username or email is already taken.' });
    }

    // Create a new user. Role and status will use defaults from the model ('Mechanic', 'pending')
    const user = await User.create({
      fullName,
      username,
      email,
      password,
    });

    if (user) {
      // Send a success message, but no token since they can't log in yet
      res.status(201).json({
        message: 'Registration successful! Your account is pending admin approval.'
      });
    } else {
      res.status(400).json({ message: 'Invalid user data.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Authenticate a user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    // Check if user exists and password matches
    if (user && (await bcrypt.compare(password, user.password))) {
      
      // THIS IS THE NEW CHECK: Ensure the user's account is active
      if (user.status !== 'active') {
        return res.status(403).json({ message: 'Your account is not active. Please contact an administrator.' });
      }

      // If active, send back user data and token
      res.json({
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// --- Admin Functions (Owner Only) ---

// @desc    Get all users
// @route   GET /api/users
// @access  Owner
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password'); // Exclude passwords
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update a user's status or role
// @route   PUT /api/users/:id
// @access  Owner
const updateUser = async (req, res) => {
  try {
    const { role, status } = req.body;
    const user = await User.findById(req.params.id);

    if (user) {
      user.role = role || user.role;
      user.status = status || user.status;
      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        fullName: updatedUser.fullName,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Error updating user' });
  }
};

// @desc    Delete a user
// @route   DELETE /api/users/:id
// @access  Owner
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      await user.deleteOne();
      res.json({ message: 'User removed' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });
};

module.exports = {
  registerUser,
  loginUser,
  getAllUsers,
  updateUser,
  deleteUser,
};