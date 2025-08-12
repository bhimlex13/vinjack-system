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
    priceAtTime: { 
      type: Number,
      required: true
    },
    costAtTime: {
        type: Number,
        required: true
    }
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