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
    enum: [ // A list of possible actions for consistency
      'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT',
      'PROCESS_SALE',
      'CREATE_SUPPLIER', 'UPDATE_SUPPLIER', 'DELETE_SUPPLIER',
      'RECORD_DELIVERY',
      
      // --- ADDED SERVICE ACTIONS ---
      'CREATE_SERVICE', 'UPDATE_SERVICE', 'DELETE_SERVICE',

      // Other existing actions
      'CREATE_USER',
      'FORCE_PASSWORD_CHANGE',
      'REJECT_PROFILE_UPDATE',
      'UPDATE_SUPPLIER'
    ]
  },
  details: { // A human-readable description of the action
    type: String,
    required: true,
  }
}, { timestamps: true }); // The `createdAt` field will serve as our log timestamp

module.exports = mongoose.model('AuditLog', auditLogSchema);