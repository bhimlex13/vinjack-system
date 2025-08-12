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
      role: 'Clerk', // <-- Added a default role
      status: 'pending' // <-- Explicitly setting status
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

    if (user && (await bcrypt.compare(password, user.password))) {
      if (user.status !== 'active') {
        return res.status(403).json({ message: 'Your account is not active. Please contact an administrator.' });
      }
      
      // THIS IS THE FIX: We are adding the 'email' field to the response
      res.json({
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email, // <-- ADD THIS LINE
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

// --- UPDATED FUNCTION for a user to request an update to their own profile ---
const requestProfileUpdate = async (req, res) => {
  try {
    const { fullName, username, email, oldPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if password change is requested
    let hashedNewPassword = null;
    if (oldPassword || newPassword || confirmPassword) {
      if (!oldPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: 'All password fields are required to change password.' });
      }

      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Old password is incorrect.' });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'New password and confirmation do not match.' });
      }

      // Hash new password immediately (more secure)
      const salt = await bcrypt.genSalt(10);
      hashedNewPassword = await bcrypt.hash(newPassword, salt);
    }

    // Store requested changes
    user.pendingChanges = {
      fullName: fullName || user.fullName,
      username: username || user.username,
      email: email || user.email,
      ...(hashedNewPassword && { password: hashedNewPassword })
    };
    user.hasPendingChanges = true;

    await user.save();

    logAction(req.user, 'REQUEST_PROFILE_UPDATE', `User ${user.username} requested profile changes.`);
    res.json({ message: 'Update request submitted successfully. Waiting for owner approval.' });

  } catch (error) {
    res.status(400).json({ message: 'Error submitting update request.', error: error.message });
  }
};


// --- UPDATED APPROVE FUNCTION to handle password changes ---
const approveUserUpdate = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.hasPendingChanges) {
      return res.status(404).json({ message: 'No pending changes found for this user.' });
    }

    // Apply pending changes to main fields
    user.fullName = user.pendingChanges.fullName || user.fullName;
    user.username = user.pendingChanges.username || user.username;
    user.email = user.pendingChanges.email || user.email;
    if (user.pendingChanges.password) {
      user.password = user.pendingChanges.password; // already hashed
    }

    // Clear pending changes
    user.pendingChanges = {};
    user.hasPendingChanges = false;

    const updatedUser = await user.save();

    logAction(req.user, 'APPROVE_PROFILE_UPDATE', `Approved profile changes for user ${updatedUser.username}.`);
    res.json(updatedUser);

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

module.exports = {
  registerUser,
  loginUser,
  getAllUsers,
  updateUser,
  deleteUser,
  requestProfileUpdate, 
  approveUserUpdate,    
  rejectUserUpdate      
};
