// server/models/motorcycleModel.js
const mongoose = require('mongoose');

const motorcycleSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  make: {
    type: String,
    required: [true, 'Motorcycle make is required (e.g., Honda, Yamaha).'],
    trim: true,
  },
  model: {
    type: String,
    required: [true, 'Motorcycle model is required (e.g., Click 125i, NMAX).'],
    trim: true,
  },
  year: {
    type: Number,
    min: 1900,
    max: new Date().getFullYear() + 1, // Allow for next year's models
  },
  color: {
    type: String,
    trim: true,
  },
  plateNumber: {
    type: String,
    trim: true,
    uppercase: true,
    unique: true,
    sparse: true, // Enforces uniqueness only for documents that have this field
  },
  vin: { // Vehicle Identification Number
    type: String,
    trim: true,
    uppercase: true,
    unique: true,
    sparse: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Motorcycle', motorcycleSchema);