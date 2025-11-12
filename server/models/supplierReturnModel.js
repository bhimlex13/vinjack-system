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
        enum: ['Defective', 'Wrong Item', 'Overstock', 'Other'], // Example reasons
      },
    }
  ],
  returnDate: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
    trim: true,
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('SupplierReturn', supplierReturnSchema);