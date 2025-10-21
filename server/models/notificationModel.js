// server/models/notificationModel.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    // CHANGED: Added 'OUT_OF_STOCK' to the enum list
    // --- MODIFICATION: Added all stock types ---
    enum: [
      'LOW_STOCK', 
      'CRITICAL_STOCK', 
      'OUT_OF_STOCK', 
      'USER_ACTION', 
      'REQUEST_STATUS'
    ], 
    // --- END MODIFICATION ---
    required: true 
  },
  link: { type: String }, // e.g., '/inventory' or '/user-management'
  
  // --- NEW: Field to store the product image URL ---
  image: { type: String, default: '' },
  // --- END NEW ---

  isRead: { type: Boolean, default: false, index: true },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);