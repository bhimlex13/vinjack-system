// server/controllers/userController.js
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logAction = require('../utils/logger');
const { RolePermission } = require('../models/permissionModel');
const { differenceInMinutes } = require('date-fns');

// @desc    Create a new user (by a Super Admin)
// @route   POST /api/users
const createUserByAdmin = async (req, res) => {
  try {
    const { fullName, email, role, adminPassword, username } = req.body;

    // 1. Verify Super Admin Password
    if (!adminPassword) {
        return res.status(400).json({ message: 'Super Admin password is required.' });
    }
    const superAdmin = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(adminPassword, superAdmin.password);
    if (!isMatch) {
        return res.status(401).json({ message: 'Incorrect Super Admin password.' });
    }

    // 2. Validate Inputs
    if (!fullName || !email || !role || !username) {
      return res.status(400).json({ message: 'Please provide Full Name, Username, Email, and Role.' });
    }

    const allowedRoles = ['Super Admin', 'Admin', 'Salesperson'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified.' });
    }

    // 3. Check for Duplicates (Email, Username, Full Name)
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'Email address is already in use.' });
    }

    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ message: 'Username is already taken.' });
    }

    const fullNameExists = await User.findOne({ fullName });
    if (fullNameExists) {
      return res.status(400).json({ message: `The name "${fullName}" is already registered.` });
    }

    // 4. Create User
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
      logAction(req.user, 'CREATE_USER', `Created a new ${role} account for ${user.fullName}.`, { entityType: 'User', entityId: user._id });
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
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide both username and password.' });
    }

    const isEmail = username.includes('@');
    const query = isEmail ? { email: username.toLowerCase() } : { username: username };
    const user = await User.findOne(query);

    if (!user) {
      logAction(null, 'LOGIN_FAILED', `Login attempt failed: User '${username}' not found.`);
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const LOCKOUT_DURATION_MINUTES = 15;
    const MAX_FAILED_ATTEMPTS = 3;

    if (user.failed_attempts >= MAX_FAILED_ATTEMPTS) {
      if (user.last_failed_attempt) {
        const minutesSinceLastAttempt = differenceInMinutes(new Date(), new Date(user.last_failed_attempt));
        
        if (minutesSinceLastAttempt < LOCKOUT_DURATION_MINUTES) {
          logAction(user, 'LOGIN_LOCKED', `Login attempt failed: Account locked for user '${username}'.`);
          const minutesRemaining = LOCKOUT_DURATION_MINUTES - minutesSinceLastAttempt;
          return res.status(403).json({ message: `Your account is temporarily locked. Please try again in ${minutesRemaining} ${minutesRemaining > 1 ? 'minutes' : 'minute'}.` });
        } else {
          user.failed_attempts = 0;
          user.last_failed_attempt = null;
          await user.save();
        }
      }
    }

    if (user.status !== 'active') {
      logAction(user, 'LOGIN_FAILED', `Login attempt failed: Account inactive for user '${username}'.`);
      return res.status(403).json({ message: 'Your account is not active. Please contact an administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      user.failed_attempts = 0;
      user.last_failed_attempt = null;
      await user.save();

      logAction(user, 'LOGIN', `User '${username}' logged in successfully.`, { entityType: 'User', entityId: user._id });

      let permissions = [];
      if (user.role === 'Super Admin') {
        permissions = ['SUPER_ADMIN_ALL'];
      } else if (user.role === 'Admin' || user.role === 'Salesperson') {
        const rolePerms = await RolePermission.findOne({ role: user.role }).lean();
        if (rolePerms) {
          permissions = rolePerms.allowedPermissions;
        }
      }

      res.json({
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
        mustChangePassword: user.mustChangePassword || false,
        dashboardPreferences: user.dashboardPreferences,
        permissions: permissions
      });

    } else {
      user.failed_attempts += 1;
      user.last_failed_attempt = new Date();
      await user.save();

      logAction(user, 'LOGIN_FAILED', `Login attempt failed: Invalid password for user '${username}'.`, { entityType: 'User', entityId: user._id });
      
      if (user.failed_attempts >= MAX_FAILED_ATTEMPTS) {
        return res.status(403).json({ message: `Your account is temporarily locked. Please try again in ${LOCKOUT_DURATION_MINUTES} minutes.` });
      }

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

// @desc    Update a user's info (Super Admin only) - REQUIRES ADMIN PASSWORD
// @route   PUT /api/users/:id
const updateUser = async (req, res) => {
  try {
    const { 
      role, 
      status, 
      fullName, 
      username, 
      email, 
      adminPassword 
    } = req.body; 
    
    // 1. Verify Admin Password
    if (!adminPassword) {
        return res.status(400).json({ message: 'Super Admin password is required to confirm changes.' });
    }
    const superAdmin = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(adminPassword, superAdmin.password);
    if (!isMatch) {
        return res.status(401).json({ message: 'Incorrect Super Admin password. Action denied.' });
    }

    // 2. Find target user
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 3. Validation Logic for Roles
    if (user.role === 'Super Admin' && user._id.toString() !== req.user.id) {
       // Super Admin can edit other Super Admins if needed.
    }
    
    // 4. Duplicate Checks (Username, Email, Full Name)
    if (username && username !== user.username) {
        const userExists = await User.findOne({ username });
        if (userExists) return res.status(400).json({ message: 'Username is already taken.' });
    }
    if (email && email !== user.email) {
        const emailExists = await User.findOne({ email });
        if (emailExists) return res.status(400).json({ message: 'Email address is already in use.' });
    }
    if (fullName && fullName !== user.fullName) {
        const fullNameExists = await User.findOne({ fullName });
        if (fullNameExists) return res.status(400).json({ message: `The name "${fullName}" is already registered.` });
    }

    // 5. Log Changes
    let details = [];
    if (fullName && user.fullName !== fullName) details.push('Full Name');
    if (username && user.username !== username) details.push('Username');
    if (email && user.email !== email) details.push('Email');
    if (role && user.role !== role) details.push('Role');
    if (status && user.status !== status) details.push('Status');

    if (details.length > 0) {
      logAction(req.user, 'UPDATE_USER', `Updated details (${details.join(', ')}) for user ${user.fullName}.`, { entityType: 'User', entityId: user._id });
    }

    // 6. Apply Updates
    if (fullName) user.fullName = fullName;
    if (username) user.username = username;
    if (email) user.email = email;
    if (role) user.role = role;
    if (status) user.status = status;

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
    console.error("Error updating user:", error);
    res.status(500).json({ message: 'Error updating user', error: error.message });
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
      res.status(404).json({ message: 'User not found' });
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
        
        // Check Admin Password
        const isMatch = await bcrypt.compare(adminPassword, adminUser.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect admin password. Authorization denied.' });
        }

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ message: 'Target user not found.' });
        }
        // Allows resetting password for anyone including other Super Admins

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

// @desc    Login as a demo admin account (for visitors/capstone demo)
// @route   POST /api/users/demo-login
const demoLogin = async (req, res) => {
  try {
    const DEMO_USERNAME = 'demo_admin';
    let user = await User.findOne({ username: DEMO_USERNAME });

    if (!user) {
      user = await User.create({
        fullName: 'Demo Admin',
        username: DEMO_USERNAME,
        email: 'demo@vinjack.com',
        password: crypto.randomBytes(32).toString('hex'),
        role: 'Super Admin',
        status: 'active',
        mustChangePassword: false,
      });
    }

    if (user.status !== 'active') {
      user.status = 'active';
      await user.save();
    }

    logAction(user, 'DEMO_LOGIN', 'Demo account accessed by a visitor.', { entityType: 'User', entityId: user._id });

    res.json({
      _id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
      mustChangePassword: false,
      dashboardPreferences: user.dashboardPreferences,
      permissions: ['SUPER_ADMIN_ALL'],
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createUserByAdmin,
  loginUser,
  demoLogin,
  forceChangePassword,
  getMe,
  getAllUsers,
  updateUser,
  deleteUser,
  getUserDetails,
  adminResetPassword,
  logoutUser,
  getDashboardPreferences,
  saveDashboardPreferences
};