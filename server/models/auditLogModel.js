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
      'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT',
      'PROCESS_SALE',
      'PROCESS_RETURN',
      'CREATE_SUPPLIER', 'UPDATE_SUPPLIER', 'DELETE_SUPPLIER',
      'CREATE_CUSTOMER', 'UPDATE_CUSTOMER', 'DELETE_CUSTOMER',
      'RECORD_DELIVERY',
      'CREATE_SERVICE', 'UPDATE_SERVICE', 'DELETE_SERVICE',
      'CREATE_USER',
      'DELETE_USER',
      'FORCE_PASSWORD_CHANGE',
      'REJECT_PROFILE_UPDATE',
      'CREATE_PO', 'UPDATE_PO', 'RECEIVE_PO', 'CANCEL_PO',
      'STOCK_ADJUSTMENT',
      'ADMIN_RESET_PASSWORD'
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