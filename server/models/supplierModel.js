// server/models/supplierModel.js
const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  // --- NEW FIELD START ---
  email: {
    type: String,
    trim: true,
    lowercase: true,
    // Basic email format validation
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please fill a valid email address'
    ]
  },
  // --- NEW FIELD END ---
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
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);