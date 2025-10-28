// server/models/auditLogModel.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      // Product Actions
      'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT', // Note: DELETE_PRODUCT might become unused
      'ARCHIVE_PRODUCT', // Added previously
      'SYNC_STOCK_STATUS',

      // Sale & Return Actions
      'PROCESS_SALE', 'UPLOAD_SALE_RECEIPT',
      'PROCESS_RETURN',

      // Supplier & PO Actions
      'CREATE_SUPPLIER', 'UPDATE_SUPPLIER', 'DELETE_SUPPLIER',
      'RECORD_DELIVERY', // Maybe rename? This is Direct Delivery
      'CREATE_PO', 'UPDATE_PO', 'CANCEL_PO', 'APPROVE_PO', 'RECEIVE_PO_STOCK',

      // Customer & Motorcycle Actions
      'CREATE_CUSTOMER', 'UPDATE_CUSTOMER', 'DELETE_CUSTOMER',
      'CREATE_MOTORCYCLE', 'UPDATE_MOTORCYCLE', 'DELETE_MOTORCYCLE',

      // Service Actions
      'CREATE_SERVICE', 'UPDATE_SERVICE', 'DELETE_SERVICE',

      // User & Auth Actions
      'CREATE_USER', 'UPDATE_USER', 'DELETE_USER',
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
      'USER_PASSWORD_CHANGE', // User changes own password
      'ADMIN_RESET_PASSWORD', // Admin resets user password
      'FORCE_PASSWORD_CHANGE', // For profile updates needing verification
      'REJECT_PROFILE_UPDATE', // Owner rejects pending update

      // Category & Brand Actions
      'CREATE_CATEGORY', 'UPDATE_CATEGORY', 'DELETE_CATEGORY',
      'CREATE_BRAND', 'UPDATE_BRAND', 'DELETE_BRAND',

      // System & Settings Actions
      'UPDATE_APP_SETTINGS', // Includes backup schedule, global settings
      'DATA_CLEANUP', // If you have a cleanup function

      // Backup & Restore Actions
      'DATA_EXPORT', // Manual JSON download (if still used)
      'DATA_RESTORE_INITIATED', // Logged before restore starts
      'DATA_RESTORE_FAILED', // Logged if restore fails
      'DATA_BACKUP_GCS_MANUAL', // *** ADDED THIS LINE ***
      'STOCK_ADJUSTMENT',

    ]
  },
  details: {
    type: String,
    required: true,
  },
  entityType: {
    type: String,
    required: false,
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
  }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);