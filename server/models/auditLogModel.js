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
      'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT',
      'ARCHIVE_PRODUCT',
      'SYNC_STOCK_STATUS',

      // Sale & Return Actions
      'PROCESS_SALE', 'UPLOAD_SALE_RECEIPT',
      'PROCESS_RETURN',

      // Supplier & PO Actions
      'CREATE_SUPPLIER', 'UPDATE_SUPPLIER', 'DELETE_SUPPLIER',
      'RECORD_DELIVERY',
      'CREATE_PO', 'UPDATE_PO', 'CANCEL_PO', 'APPROVE_PO', 'RECEIVE_PO_STOCK',

      // Customer & Motorcycle Actions
      'CREATE_CUSTOMER', 'UPDATE_CUSTOMER', 'DELETE_CUSTOMER',
      'CREATE_MOTORCYCLE', 'UPDATE_MOTORCYCLE', 'DELETE_MOTORCYCLE',

      // Service Actions
      'CREATE_SERVICE', 'UPDATE_SERVICE', 'DELETE_SERVICE',

      // User & Auth Actions
      'CREATE_USER', 'UPDATE_USER', 'DELETE_USER',
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
      'LOGIN_LOCKED', // <--- *** ADDED THIS LINE TO FIX THE ERROR ***
      'USER_PASSWORD_CHANGE',
      'ADMIN_RESET_PASSWORD',
      'FORCE_PASSWORD_CHANGE',
      'REJECT_PROFILE_UPDATE',

      // Category & Brand Actions
      'CREATE_CATEGORY', 'UPDATE_CATEGORY', 'DELETE_CATEGORY',
      'CREATE_BRAND', 'UPDATE_BRAND', 'DELETE_BRAND',

      // System & Settings Actions
      'UPDATE_APP_SETTINGS',
      'DATA_CLEANUP',

      // Backup & Restore Actions
      'DATA_EXPORT',
      'DATA_RESTORE_INITIATED',
      'DATA_RESTORE_FAILED',
      'DATA_BACKUP_GCS_MANUAL',
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