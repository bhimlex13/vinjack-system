// server/controllers/userController.js
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Register a new user for approval
const registerUser = async (req, res) => {
  try {
    const { fullName, username, email, password } = req.body;
    if (!fullName || !username || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }
    const userExists = await User.findOne({ $or: [{ username }, { email }] });
    if (userExists) {
      return res.status(400).json({ message: 'Username or email is already taken.' });
    }
    const user = await User.create({
      fullName,
      username,
      email,
      password,
      role: 'Clerk',
      status: 'pending'
    });
    if (user) {
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
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      console.log(`Attempting login for user: ${username}. Password comparison result: ${isMatch}`); // <-- ADDED LOG
      
      if (isMatch) {
        if (user.status !== 'active') {
          return res.status(403).json({ message: 'Your account is not active. Please contact an administrator.' });
        }
        
        res.json({
          _id: user._id,
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          role: user.role,
          token: generateToken(user._id),
        });
      } else {
        res.status(401).json({ message: 'Invalid username or password.' });
      }
    } else {
      res.status(401).json({ message: 'Invalid username or password.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
const getMe = async (req, res) => {
  try {
    // req.user is set by the protect middleware
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    User requests an update to their own profile
// @route   PUT /api/users/profile
// @access  Private
const requestProfileUpdate = async (req, res) => {
  try {
    const { fullName, username, email, oldPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const requestedChanges = {};

    // Check for non-password field changes
    if (fullName) requestedChanges.fullName = fullName;
    if (username) requestedChanges.username = username;
    if (email) requestedChanges.email = email;

    // Check if password change is requested
    if (newPassword) {
      if (!oldPassword || !confirmPassword) {
        return res.status(400).json({ message: 'All password fields are required to change password.' });
      }

      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Old password is incorrect.' });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'New password and confirmation do not match.' });
      }

      // Pre-hash the new password before storing it for approval
      const salt = await bcrypt.genSalt(10);
      requestedChanges.password = await bcrypt.hash(newPassword, salt);
    }

    if (Object.keys(requestedChanges).length === 0) {
        return res.status(400).json({ message: 'No changes were requested.' });
    }

    // Store requested changes for approval
    user.pendingChanges = requestedChanges;
    user.hasPendingChanges = true;
    await user.save();
    
    // logAction(req.user, 'REQUEST_PROFILE_UPDATE', ...);
    res.json({ message: 'Update request submitted successfully. Waiting for owner approval.' });

  } catch (error) {
    res.status(400).json({ message: 'Error submitting update request.', error: error.message });
  }
};


// @desc    Owner approves a user's pending update
// @route   POST /api/users/:id/approve
// @access  Private (Owner)
const approveUserUpdate = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.hasPendingChanges) {
      return res.status(404).json({ message: 'No pending changes found for this user.' });
    }

    // Apply all pending changes directly from the pendingChanges object
    Object.assign(user, user.pendingChanges);
    
    // Clear the pending changes flags
    user.pendingChanges = undefined; // Use undefined to remove the object completely
    user.hasPendingChanges = false;
    
    // The pre-save hook in userModel will now see that `password` is modified,
    // but it will NOT re-hash it because it's already a hash (length > 50).
    const updatedUser = await user.save();

    // logAction(req.user, 'APPROVE_PROFILE_UPDATE', ...);
    res.json({ message: 'User profile updated successfully.', user: updatedUser });

  } catch (error) {
    res.status(400).json({ message: 'Error approving changes.', error: error.message });
  }
};


// --- NEW FUNCTION for the Owner to reject changes ---
const rejectUserUpdate = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || !user.hasPendingChanges) {
            return res.status(404).json({ message: 'No pending changes found for this user.' });
        }

        // Clear the pending changes without applying them
        user.pendingChanges = {};
        user.hasPendingChanges = false;
        
        await user.save();
        
        logAction(req.user, 'REJECT_PROFILE_UPDATE', `Rejected profile changes for user ${user.username}.`);
        res.json({ message: 'Pending changes have been rejected.' });

    } catch (error) {
        res.status(400).json({ message: 'Error rejecting changes.', error: error.message });
    }
};


// --- Admin Functions (Owner Only) ---
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

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

// Mock logAction function
const logAction = (user, actionType, description) => {
  console.log(`Action Logged: User=${user.username}, Type=${actionType}, Description=${description}`);
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  getAllUsers,
  updateUser,
  deleteUser,
  requestProfileUpdate, 
  approveUserUpdate,    
  rejectUserUpdate      
};