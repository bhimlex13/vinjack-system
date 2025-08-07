// server/utils/logger.js
const AuditLog = require('../models/auditLogModel');

/**
 * Logs a user action to the database.
 * @param {object} user - The user object from req.user.
 * @param {string} action - The type of action performed (e.g., 'CREATE_PRODUCT').
 * @param {string} details - A description of the action.
 */
const logAction = async (user, action, details) => {
  try {
    if (!user) {
      console.error('LogAction Error: User is undefined. Action was not logged.');
      return;
    }
    
    await AuditLog.create({
      user: user._id,
      action,
      details,
    });
  } catch (error) {
    console.error('Error logging action:', error);
  }
};

module.exports = logAction;