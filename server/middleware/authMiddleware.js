// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { RolePermission } = require('../models/permissionModel'); // <-- NEW: Import permission model

// Middleware to protect routes by verifying JWT
const protect = async (req, res, next) => {
  let token;

  // Check if the token is in the headers and starts with 'Bearer'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header (e.g., "Bearer eyJhbGci...")
      token = req.headers.authorization.split(' ')[1];

      // Verify the token using the secret key
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find the user by the ID from the token and attach it to the request object
      // We exclude the password from the user object
      req.user = await User.findById(decoded.id).select('-password');

      next(); // Move to the next middleware or route handler
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Middleware to authorize based on user role (Legacy - We will replace this)
const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if the user's role is included in the roles allowed for this route
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Forbidden: User role '${req.user.role}' is not authorized.` });
    }
    next();
  };
};

// --- NEW: Permission-based Middleware ---
/**
 * @desc    Middleware to check if a user's role has a specific permission
 * @usage   checkPermission('canManageInventory')
 */
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    // 1. The 'Super Admin' role bypasses all permission checks
    if (req.user.role === 'Super Admin') {
      return next();
    }

    // 2. For 'Admin' and 'Salesperson', check their permissions
    if (req.user.role === 'Admin' || req.user.role === 'Salesperson') {
      try {
        // Find the permissions document for the user's role
        // We can add caching here later if needed
        const rolePerms = await RolePermission.findOne({ role: req.user.role }).lean();

        if (rolePerms && rolePerms.allowedPermissions.includes(requiredPermission)) {
          // 3. User has the permission, proceed
          return next();
        }
        
        // 4. User does not have the permission
        return res.status(403).json({ 
          message: `Forbidden: Your role ('${req.user.role}') does not have the required permission: '${requiredPermission}'.` 
        });

      } catch (error) {
        return res.status(500).json({ message: 'Server error during permission check.' });
      }
    }
    
    // 5. Fallback for any other case (e.g., if a new role is added without permissions)
    return res.status(403).json({ message: 'Forbidden. You do not have access.' });
  };
};
// --- END NEW ---

module.exports = { protect, authorize, checkPermission }; // <-- NEW: Export checkPermission