// server/models/serviceModel.js
const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a service name'],
    trim: true,
    unique: true,
  },
  description: {
    type: String,
    trim: true,
  },
  charge: {
    type: Number,
    required: [true, 'Please provide a fixed charge for the service'],
    min: [0, 'Charge cannot be negative'],
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);