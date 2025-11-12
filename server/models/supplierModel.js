// server/models/supplierModel.js
const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please fill a valid email address'
    ]
  },
  contactPerson: {
    type: String,
    trim: true
  },
  contactNumber: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  
  // --- NEW FIELDS START ---
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
    required: true
  },
  paymentTerms: {
    type: String,
    enum: ['Cash', 'Consignment', 'Terms'], 
    default: 'Cash',
    required: true
  }
  // --- NEW FIELDS END ---

}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);