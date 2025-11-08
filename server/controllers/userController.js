// server/controllers/userController.js
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../utils/emailService');
const { createNotification } = require('../utils/notificationManager');
const logAction = require('../utils/logger');
// --- NEW: Import the RolePermission model ---
const { RolePermission } = require('../models/permissionModel');

// @desc    Create a new user (by a Super Admin)
// @route   POST /api/users
const createUserByAdmin = async (req, res) => {
  try {
    const { fullName, email, role } = req.body;
    if (!fullName || !email || !role) {
      return res.status(400).json({ message: 'Please provide Full Name, Email, and Role.' });
    }

    const allowedRoles = ['Admin', 'Salesperson'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified. Can only create Admin or Salesperson.' });
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

// @desc    Authenticate a user & get token
// @route   POST /api/users/login
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        if (user.status !== 'active') {
          logAction(user, 'LOGIN_FAILED', `Login attempt failed: Account inactive for user '${username}'.`);
          return res.status(403).json({ message: 'Your account is not active. Please contact an administrator.' });
        }
        logAction(user, 'LOGIN', `User '${username}' logged in successfully.`, { entityType: 'User', entityId: user._id });

        // --- NEW: Fetch permissions based on role ---
        let permissions = [];
        if (user.role === 'Super Admin') {
          // Super Admin gets all permissions. We use a special key.
          permissions = ['SUPER_ADMIN_ALL'];
        } else if (user.role === 'Admin' || user.role === 'Salesperson') {
          // Fetch the specific permissions for Admin or Salesperson
          const rolePerms = await RolePermission.findOne({ role: user.role }).lean();
          if (rolePerms) {
            permissions = rolePerms.allowedPermissions;
          }
          // If no permissions are set, they get an empty array (no access)
        }
        // --- END NEW ---

        res.json({
          _id: user._id,
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          role: user.role,
          token: generateToken(user._id),
          mustChangePassword: user.mustChangePassword || false,
          dashboardPreferences: user.dashboardPreferences,
          permissions: permissions // <-- ADDED: Send permissions to the client
        });
      } else {
        logAction(user, 'LOGIN_FAILED', `Login attempt failed: Invalid password for user '${username}'.`, { entityType: 'User', entityId: user._id });
        res.status(401).json({ message: 'Invalid username or password.' });
      }
    } else {
      logAction(null, 'LOGIN_FAILED', `Login attempt failed: User '${username}' not found.`);
      res.status(401).json({ message: 'Invalid username or password.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Force password change for new/reset users
// @route   POST /api/users/force-change-password
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

// @desc    Get current user data
// @route   GET /api/users/me
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

// @desc    Request a profile update (for self)
// @route   PUT /api/users/profile/request-update
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
      logAction(req.user, 'USER_PASSWORD_CHANGE', `User requested to change their password.`, { entityType: 'User', entityId: user._id });
    }
    if (Object.keys(requestedChanges).length === 0) {
      return res.status(400).json({ message: 'No changes were requested.' });
    }

    if (user.role === 'Super Admin') {
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.verificationCode = verificationCode;
      user.verificationCodeExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
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
        recipientRole: 'Super Admin',
        message: `${user.fullName} has requested a profile update.`,
        type: 'USER_ACTION',
        link: '/user-management'
      });
      if (newNotifications && newNotifications.length) {
          newNotifications.forEach(notification => {
              io.to(notification.user.toString()).emit('new_notification', notification);
          });
      }
      res.json({ message: 'Update request submitted successfully. Waiting for Super Admin approval.' });
    }
  } catch (error) {
    console.error('Error in requestProfileUpdate:', error);
    res.status(500).json({ message: 'Error submitting update request.', error: error.message });
  }
};

// @desc    Verify and apply self-update with an email code
// @route   POST /api/users/profile/verify-update
const verifySelfUpdateWithCode = async (req, res) => {
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

// @desc    Approve a pending update for another user (Super Admin only)
// @route   PUT /api/users/approve-update/:id
const approveUserUpdate = async (req, res) => {
  const io = req.app.get('socketio');
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.hasPendingChanges) {
      return res.status(400).json({ message: 'No pending changes found for this user.' });
    }
    logAction(req.user, 'UPDATE_USER', `Approved profile changes for user ${user.username}.`, { entityType: 'User', entityId: user._id });
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

// @desc    Reject a pending update for another user (Super Admin only)
// @route   PUT /api/users/reject-update/:id
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

// @desc    Get all users (Super Admin only)
// @route   GET /api/users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update a user's role or status (Super Admin only)
// @route   PUT /api/users/:id
const updateUser = async (req, res) => {
  try {
    const { role, status } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'Super Admin' && user._id.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Cannot modify another Super Admin account.' });
    }
    if (role === 'Super Admin' && req.user.role !== 'Super Admin') {
        return res.status(403).json({ message: 'Not authorized to promote users to Super Admin.' });
    }
    if (user.role === 'Super Admin' && role !== 'Super Admin' && role) {
        return res.status(403).json({ message: 'A Super Admin cannot be demoted.' });
    }

    let details = [];
    if (role && user.role !== role) details.push(`role to '${role}'`);
    if (status && user.status !== status) details.push(`status to '${status}'`);

    if (details.length > 0) {
      logAction(req.user, 'UPDATE_USER', `Updated user ${user.fullName}'s ${details.join(' and ')}.`, { entityType: 'User', entityId: user._id });
    }

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
  } catch (error) {
    res.status(400).json({ message: 'Error updating user' });
  }
};

// @desc    Delete a user (Super Admin only)
// @route   DELETE /api/users/:id
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      if (user.role === 'Super Admin') {
        return res.status(403).json({ message: 'Super Admin accounts cannot be deleted.' });
      }
      const deletedUserName = user.fullName;
      const deletedUserId = user._id;
      await user.deleteOne();
      logAction(req.user, 'DELETE_USER', `Deleted user: '${deletedUserName}'`, { entityType: 'User', entityId: deletedUserId });
      res.json({ message: 'User removed' });
    } else {
      res.status(4404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error("Error in deleteUser:", error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Log out a user
// @route   POST /api/users/logout
const logoutUser = (req, res) => {
  try {
    const userFullName = req.user ? req.user.fullName : 'Unknown User';
    const userId = req.user ? req.user._id : null;
    logAction(req.user, 'LOGOUT', `User '${userFullName}' logged out.`, { entityType: 'User', entityId: userId });
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ message: 'Server error during logout.' });
  }
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// @desc    Get a specific user's details (Super Admin only)
// @route   GET /api/users/:id
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

// @desc    Reset a non-Super Admin's password (Super Admin only)
// @route   POST /api/users/admin-reset-password/:id
const adminResetPassword = async (req, res) => {
    try {
        const { adminPassword } = req.body;
        const targetUserId = req.params.id;
        const adminUser = await User.findById(req.user.id);
        if (!adminUser) {
            return res.status(404).json({ message: 'Admin user not found.' });
        }
        const isMatch = await bcrypt.compare(adminPassword, adminUser.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect admin password. Authorization denied.' });
        }
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ message: 'Target user not found.' });
        }
        if (targetUser.role === 'Super Admin') {
            return res.status(403).json({ message: 'Cannot reset password for another Super Admin account.' });
        }
        const temporaryPassword = crypto.randomBytes(8).toString('hex').slice(0, 10);
        targetUser.password = temporaryPassword;
        targetUser.mustChangePassword = true;
        await targetUser.save();
        logAction(req.user, 'ADMIN_RESET_PASSWORD', `Reset password for user ${targetUser.fullName}.`, { entityType: 'User', entityId: targetUser._id });
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

// @desc    Get current user's dashboard preferences
// @route   GET /api/users/dashboard-preferences
const getDashboardPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('dashboardPreferences');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user.dashboardPreferences || {});
  } catch (error) {
    console.error('Error getting dashboard preferences:', error);
    res.status(500).json({ message: 'Server error getting preferences.' });
  }
};

// @desc    Save current user's dashboard preferences
// @route   PUT /api/users/dashboard-preferences
const saveDashboardPreferences = async (req, res) => {
  try {
    const { timeRange, selectedCategory, selectedSupplier } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          'dashboardPreferences.timeRange': timeRange,
          'dashboardPreferences.selectedCategory': selectedCategory,
          'dashboardPreferences.selectedSupplier': selectedSupplier,
        }
      },
      { new: true, runValidators: true }
    ).select('dashboardPreferences');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    logAction(req.user, 'UPDATE_PREFERENCES', 'User updated their dashboard preferences.');
    res.json({ message: 'Preferences saved!', preferences: user.dashboardPreferences });
  } catch (error) {
    console.error('Error saving dashboard preferences:', error);
    res.status(500).json({ message: 'Server error saving preferences.' });
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
  verifySelfUpdateWithCode,
  approveUserUpdate,
  rejectUserUpdate,
  getUserDetails,
  adminResetPassword,
  logoutUser,
  getDashboardPreferences,
  saveDashboardPreferences
};