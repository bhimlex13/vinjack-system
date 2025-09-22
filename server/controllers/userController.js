// server/controllers/userController.js
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../utils/emailService');
const { createNotification } = require('../utils/notificationManager');
const logAction = require('../utils/logger');

// ... (all existing functions like createUserByAdmin, loginUser, etc. remain unchanged)
const createUserByAdmin = async (req, res) => {
  try {
    const { fullName, email, role } = req.body;
    if (!fullName || !email || !role) {
      return res.status(400).json({ message: 'Please provide Full Name, Email, and Role.' });
    }
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'Email is already in use.' });
    }
    let username = email.split('@')[0];
    const userExists = await User.findOne({ username });
    if (userExists) {
      username = `${username}${crypto.randomBytes(2).toString('hex')}`;
    }
    const temporaryPassword = crypto.randomBytes(8).toString('hex').slice(0, 10);
    const user = await User.create({
      fullName,
      username,
      email,
      password: temporaryPassword,
      role,
      status: 'active',
      mustChangePassword: true,
    });
    if (user) {
      logAction(req.user, 'CREATE_USER', `Created a new user account for ${user.fullName}.`, { entityType: 'User', entityId: user._id });
      res.status(201).json({
        message: 'User created successfully. Please provide them with their credentials.',
        generatedUsername: username,
        temporaryPassword: temporaryPassword,
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
          mustChangePassword: user.mustChangePassword || false,
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

const forceChangePassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;
        if (!newPassword || !confirmPassword) {
            return res.status(400).json({ message: 'Please provide both new password fields.' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match.' });
        }
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        user.password = newPassword;
        user.mustChangePassword = false;
        await user.save();
        logAction(req.user, 'FORCE_PASSWORD_CHANGE', `User successfully changed their temporary password.`, { entityType: 'User', entityId: user._id });
        res.json({ message: 'Password has been updated successfully. You can now access the system.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error while updating password.', error: error.message });
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
  const io = req.app.get('socketio');
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
      await User.findByIdAndUpdate(req.user.id, {
        $set: {
          pendingChanges: requestedChanges,
          hasPendingChanges: true,
        }
      });
      const newNotifications = await createNotification({
        recipientRole: 'Owner',
        message: `${user.fullName} has requested a profile update.`,
        type: 'USER_ACTION',
        link: '/user-management'
      });
      if (newNotifications && newNotifications.length) {
          newNotifications.forEach(notification => {
              io.to(notification.user.toString()).emit('new_notification', notification);
          });
      }
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
    if (user.pendingChanges.fullName) user.fullName = user.pendingChanges.fullName;
    if (user.pendingChanges.username) user.username = user.pendingChanges.username;
    if (user.pendingChanges.email) user.email = user.pendingChanges.email;
    if (user.pendingChanges.password) user.password = user.pendingChanges.password;
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
  const io = req.app.get('socketio');
  try {
    const user = await User.findById(req.params.id); 
    if (!user || !user.hasPendingChanges) {
      return res.status(400).json({ message: 'No pending changes found for this user.' });
    }
    if (user.pendingChanges.fullName) user.fullName = user.pendingChanges.fullName;
    if (user.pendingChanges.username) user.username = user.pendingChanges.username;
    if (user.pendingChanges.email) user.email = user.pendingChanges.email;
    if (user.pendingChanges.password) user.password = user.pendingChanges.password;
    user.pendingChanges = undefined;
    user.hasPendingChanges = false;
    const updatedUser = await user.save();
    const newNotifications = await createNotification({
        recipientId: updatedUser._id,
        message: `Your profile update request has been approved.`,
        type: 'REQUEST_STATUS',
        link: '/settings'
    });
    if (newNotifications && newNotifications.length) {
        newNotifications.forEach(notification => {
            io.to(notification.user.toString()).emit('new_notification', notification);
        });
    }
    res.json({ message: 'User profile updated successfully.', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Error approving changes.', error: error.message });
  }
};

const rejectUserUpdate = async (req, res) => {
    const io = req.app.get('socketio');
    try {
        const user = await User.findById(req.params.id);
        if (!user || !user.hasPendingChanges) {
            return res.status(400).json({ message: 'No pending changes found for this user.' });
        }
        user.pendingChanges = undefined;
        user.hasPendingChanges = false;
        await user.save();
        const newNotifications = await createNotification({
            recipientId: user._id,
            message: `Your profile update request was rejected.`,
            type: 'REQUEST_STATUS',
            link: '/settings'
        });
        if (newNotifications && newNotifications.length) {
            newNotifications.forEach(notification => {
                io.to(notification.user.toString()).emit('new_notification', notification);
            });
        }
        logAction(req.user, 'REJECT_PROFILE_UPDATE', `Rejected profile changes for user ${user.username}.`, { entityType: 'User', entityId: user._id });
        res.json({ message: 'Pending changes have been rejected.' });
    } catch (error) {
        res.status(500).json({ message: 'Error rejecting changes.', error: error.message });
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
      const deletedUserName = user.fullName;
      const deletedUserId = user._id;
      await user.deleteOne();
      logAction(req.user, 'DELETE_USER', `Deleted user: '${deletedUserName}'`, { entityType: 'User', entityId: deletedUserId });
      res.json({ message: 'User removed' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error("Error in deleteUser:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: 'Server error while fetching user details.' });
  }
};

// --- 3. ADD THE NEW CONTROLLER FUNCTION FOR ADMIN PASSWORD RESET ---
const adminResetPassword = async (req, res) => {
    try {
        const { adminPassword } = req.body;
        const targetUserId = req.params.id;

        // Step 1: Verify the admin making the request
        const adminUser = await User.findById(req.user.id);
        if (!adminUser) {
            return res.status(404).json({ message: 'Admin user not found.' });
        }

        const isMatch = await bcrypt.compare(adminPassword, adminUser.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect admin password. Authorization denied.' });
        }

        // Step 2: Find the target user to reset
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ message: 'Target user not found.' });
        }

        // Prevent an Owner from resetting another Owner's password
        if (targetUser.role === 'Owner') {
            return res.status(403).json({ message: 'Cannot reset password for another Owner account.' });
        }

        // Step 3: Generate a new temporary password and update the user
        const temporaryPassword = crypto.randomBytes(8).toString('hex').slice(0, 10);
        targetUser.password = temporaryPassword;
        targetUser.mustChangePassword = true;
        await targetUser.save();
        
        // Step 4: Log the action
        logAction(req.user, 'ADMIN_RESET_PASSWORD', `Reset password for user ${targetUser.fullName}.`, { entityType: 'User', entityId: targetUser._id });

        // Step 5: Return the new credentials to the admin
        res.json({
            message: 'User password has been reset.',
            username: targetUser.username,
            temporaryPassword: temporaryPassword,
        });

    } catch (error) {
        console.error("Error in adminResetPassword:", error);
        res.status(500).json({ message: 'Server error during password reset.' });
    }
};


module.exports = {
  createUserByAdmin, 
  loginUser,
  forceChangePassword, 
  getMe,
  getAllUsers,
  updateUser,
  deleteUser,
  requestProfileUpdate, 
  verifyOwnerUpdate,
  approveUserUpdate,    
  rejectUserUpdate,
  getUserDetails,
  adminResetPassword // <-- 4. EXPORT THE NEW FUNCTION
};