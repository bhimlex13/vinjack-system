// server/models/deliveryModel.js
const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  // An array to hold all products received in this delivery
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
    // The cost per unit at the time of this delivery
    costAtTime: {
      type: Number,
      required: true
    }
  }],
  deliveryDate: {
    type: Date,
    default: Date.now
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);