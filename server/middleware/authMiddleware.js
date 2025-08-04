const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const protect = async (req, res, next) => { /* ... JWT verification logic ... */ };
const checkRole = (roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
    }
    next();
};

module.exports = { protect, checkRole };