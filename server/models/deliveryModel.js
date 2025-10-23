// server/models/deliveryModel.js
const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
    // Removed required: true as direct delivery might not always have a supplier selected? Re-add if needed.
  },
  purchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
    required: false // Optional link
  },
  // --- NEW: deliveryDate field ---
  deliveryDate: {
    type: Date,
    required: true,
    default: Date.now // Default to now if not provided
  },
  // --- END NEW ---
  productsReceived: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    costAtTime: {
      type: Number,
      required: true // Cost is usually required for deliveries
    }
  }],
  // --- NEW: totalCost field (optional but good for summary) ---
  totalCost: {
      type: Number,
      required: false // Calculated or provided
  },
  // --- END NEW ---
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true }); // Keep timestamps for createdAt/updatedAt

module.exports = mongoose.model('Delivery', deliverySchema);