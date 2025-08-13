// server/controllers/userController.js
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail } = require('../utils/emailService');
// ADDED: Import the new notification manager
const { createNotification } = require('../utils/notificationManager'); 
const logAction = require('../utils/logger');

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
      // ADDED: Create a notification for the Owner about the new registration
      await createNotification({
        recipientRole: 'Owner',
        message: `${user.fullName} has registered and is awaiting approval.`,
        type: 'USER_ACTION',
        link: '/user-management'
      });

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

const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      
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

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const requestProfileUpdate = async (req, res) => {
  try {
    const { fullName, username, email, oldPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const requestedChanges = {};
    if (fullName) requestedChanges.fullName = fullName;
    if (username) requestedChanges.username = username;
    if (email) requestedChanges.email = email;

    if (newPassword) {
      if (!oldPassword || !confirmPassword) {
        return res.status(400).json({ message: 'All password fields are required for password change.' });
      }
      if (!await bcrypt.compare(oldPassword, user.password)) {
        return res.status(400).json({ message: 'Old password is incorrect.' });
      }
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'New passwords do not match.' });
      }
      const salt = await bcrypt.genSalt(10);
      requestedChanges.password = await bcrypt.hash(newPassword, salt);
    }
    
    if (Object.keys(requestedChanges).length === 0) {
      return res.status(400).json({ message: 'No changes were requested.' });
    }

    if (user.role === 'Owner') {
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.verificationCode = verificationCode;
      user.verificationCodeExpires = Date.now() + 5 * 60 * 1000;
      user.pendingChanges = requestedChanges;

      await user.save();
      await sendVerificationEmail(user.email, verificationCode);
      
      res.json({ 
        message: 'Verification code sent to your email. Please check your inbox.',
        requiresVerification: true 
      });

    } else {
      user.pendingChanges = requestedChanges;
      user.hasPendingChanges = true;
      await user.save();

      // ADDED: Create a notification for the Owner about the update request
      await createNotification({
        recipientRole: 'Owner',
        message: `${user.fullName} has requested a profile update.`,
        type: 'USER_ACTION',
        link: '/user-management'
      });

      res.json({ message: 'Update request submitted successfully. Waiting for owner approval.' });
    }

  } catch (error) {
    console.error('Error in requestProfileUpdate:', error);
    res.status(500).json({ message: 'Error submitting update request.', error: error.message });
  }
};

const verifyOwnerUpdate = async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user.id);

    if (!user || !user.verificationCode || user.verificationCodeExpires < Date.now()) {
      return res.status(400).json({ message: 'Verification code is invalid or has expired. Please try again.' });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ message: 'The verification code you entered is incorrect.' });
    }
    
    Object.assign(user, user.pendingChanges);

    user.pendingChanges = undefined;
    user.hasPendingChanges = false;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;

    await user.save();

    res.json({ message: 'Your profile has been updated successfully!' });

  } catch (error) {
    res.status(500).json({ message: 'Server error during verification.', error: error.message });
  }
};

const approveUserUpdate = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.hasPendingChanges) {
      return res.status(404).json({ message: 'No pending changes found for this user.' });
    }

    Object.assign(user, user.pendingChanges);
    
    user.pendingChanges = undefined;
    user.hasPendingChanges = false;
    
    const updatedUser = await user.save();

    // ADDED: Create a notification for the specific user whose request was approved
    await createNotification({
        recipientId: updatedUser._id,
        message: `Your profile update request has been approved.`,
        type: 'REQUEST_STATUS',
        link: '/settings'
    });

    res.json({ message: 'User profile updated successfully.', user: updatedUser });

  } catch (error) {
    res.status(400).json({ message: 'Error approving changes.', error: error.message });
  }
};

const rejectUserUpdate = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || !user.hasPendingChanges) {
            return res.status(404).json({ message: 'No pending changes found for this user.' });
        }

        user.pendingChanges = {};
        user.hasPendingChanges = false;
        
        await user.save();
        
        // ADDED: Create a notification for the specific user whose request was rejected
        await createNotification({
            recipientId: user._id,
            message: `Your profile update request was rejected.`,
            type: 'REQUEST_STATUS',
            link: '/settings'
        });

        logAction(req.user, 'REJECT_PROFILE_UPDATE', `Rejected profile changes for user ${user.username}.`);
        res.json({ message: 'Pending changes have been rejected.' });

    } catch (error) {
        res.status(400).json({ message: 'Error rejecting changes.', error: error.message });
    }
};

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

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  getAllUsers,
  updateUser,
  deleteUser,
  requestProfileUpdate, 
  verifyOwnerUpdate,
  approveUserUpdate,    
  rejectUserUpdate      
};
