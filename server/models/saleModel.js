// server/models/saleModel.js
const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({

  items: [{
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
    priceAtTime: { // Selling price at time of sale
      type: Number,
      required: true
    },
    // REMOVED: costAtTime (replaced by costOfGoodsSold)
    // costAtTime: {
    //     type: Number,
    //     required: true
    // }
    // --- NEW FIELD ---
    costOfGoodsSold: { // Actual cost of the item when it was sold
      type: Number,
      required: true,
      min: 0,
      default: 0 // Default to 0, should be set in controller
    }
    // --- END NEW FIELD ---
  }],

  services: [{
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

  totalAmount: {
    type: Number,
    required: true
  },

  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },

  motorcycle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Motorcycle'
  },

  customerReceiptImage: {
    type: String,
  },

  isManualEntry: {
    type: Boolean,
    default: false
  },

}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);