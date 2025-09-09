// server/models/customerModel.js
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required.'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    sparse: true, // Allows multiple documents to have a null email, but unique if provided
    match: [/.+\@.+\..+/, 'Please fill a valid email address']
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },

  // --- ADDED ---
  // A list of motorcycles owned by this customer
  motorcycles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Motorcycle'
  }]
  // --- END ADDED ---

}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);