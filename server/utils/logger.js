// server/utils/logger.js
const AuditLog = require('../models/auditLogModel');

/**
 * Logs a user action to the database.
 * @param {object} user - The user object from req.user.
 * @param {string} action - The type of action performed (e.g., 'CREATE_PRODUCT').
 * @param {string} details - A description of the action.
 * @param {object} [entityInfo] - Optional object with entityType and entityId.
 * @param {string} [entityInfo.entityType] - The model name of the related entity (e.g., 'Sale').
 * @param {string} [entityInfo.entityId] - The ObjectId of the related entity.
 */
const logAction = async (user, action, details, entityInfo = {}) => {
  try {
    if (!user) {
      console.error('LogAction Error: User is undefined. Action was not logged.');
      return;
    }
    
    const logData = {
      user: user._id,
      action,
      details,
      entityType: entityInfo.entityType || undefined,
      entityId: entityInfo.entityId || undefined,
    };

    await AuditLog.create(logData);

  } catch (error) {
    console.error('Error logging action:', error);
  }
};

module.exports = logAction;