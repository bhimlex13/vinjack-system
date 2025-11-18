// server/models/supplierReturnModel.js
const mongoose = require('mongoose');

const supplierReturnSchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
  },
  productsReturned: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      reason: {
        type: String,
        required: true,
        trim: true,
        enum: ['Defective', 'Wrong Item', 'Overstock', 'Other'], 
      },
      wasConsigned: {
        type: Boolean,
        default: false,
        required: true
      }
    }
  ],
  returnDate: {
    type: Date,
    required: true // --- MODIFIED: Removed default, will be set by controller ---
  },
  notes: {
    type: String,
    trim: true,
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // --- NEW: Fields to link to the original purchase ---
  originalPurchase: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'originalPurchaseType',
    required: false // Optional, as user may not select one
  },
  originalPurchaseType: {
    type: String,
    enum: ['PurchaseOrder', 'Delivery'],
    required: function() { return !!this.originalPurchase; } // Required only if originalPurchase is set
  }
  // --- END NEW ---
}, { timestamps: true });

module.exports = mongoose.model('SupplierReturn', supplierReturnSchema);