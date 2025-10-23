// server/models/returnModel.js
const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema({
  originalSale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true
  },
  itemsReturned: [{
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
    priceAtTime: { // The price at which the item was sold, for refund calculation
      type: Number,
      required: true
    }
  }],
  servicesReturned: [{
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true
    },
    priceAtTime: {
      type: Number,
      required: true
    }
  }],
  reason: {
    type: String,
    required: [true, 'A reason for the return is required.'],
    trim: true
  },
  // --- NEW FIELD ADDED ---
  outcome: {
    type: String,
    required: true,
    enum: ['Restocked', 'Refunded', 'Replaced', 'Discarded'],
    default: 'Restocked' // Defaulting to Restocked as that's the current behavior
  },
  // --- END NEW FIELD ---
  totalRefundAmount: {
    type: Number,
    required: true
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Return', returnSchema);