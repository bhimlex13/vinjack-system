const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

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

// Middleware to authorize based on user role
const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if the user's role is included in the roles allowed for this route
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Forbidden: User role '${req.user.role}' is not authorized.` });
    }
    next();
  };
};

module.exports = { protect, authorize };