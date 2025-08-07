// server/models/saleModel.js
const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  // An array to hold all items sold in this transaction
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
    priceAtTime: { // The price of the item when it was sold
      type: Number,
      required: true
    },
    costAtTime: { // The cost of the item when it was sold
        type: Number,
        required: true
    }
  }],
  
  // An array for any services rendered
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

  // Optional fields
  motorcycle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Motorcycle' // We will create this model later
  },

  customerReceiptImage: { // For uploading a photo of the physical receipt
    type: String, 
  },

  isManualEntry: { // To flag sales entered after the fact
    type: Boolean,
    default: false
  },

}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

module.exports = mongoose.model('Sale', saleSchema);