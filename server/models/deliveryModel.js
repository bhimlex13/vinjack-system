// server/models/deliveryModel.js
const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  purchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
    required: false // Optional link
  },
  deliveryDate: {
    type: Date,
    required: true,
    default: Date.now 
  },
  
  // --- NEW ---
  // Specifies if this delivery adds to owned stock or consigned stock
  deliveryType: {
    type: String,
    enum: ['Purchase', 'Consignment'],
    default: 'Purchase',
    required: true
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
      required: true
    }
  }],
  totalCost: {
      type: Number,
      required: false 
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);