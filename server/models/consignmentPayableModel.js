// server/models/consignmentPayableModel.js
const mongoose = require('mongoose');

const consignmentPayableSchema = new mongoose.Schema({
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
  },
  quantitySold: {
    type: Number,
    required: true,
    min: 1,
  },
  costAtTimeOfSale: {
    type: Number,
    required: true,
    min: 0,
  },
  amountOwed: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['Owed', 'Paid'],
    default: 'Owed',
  },
  paidDate: {
    type: Date,
  },
  // This is the user who processed the sale
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('ConsignmentPayable', consignmentPayableSchema);