// server/models/movementModel.js
const mongoose = require('mongoose');

const movementSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  type: {
    type: String,
    enum: ['SALE', 'DELIVERY', 'ADJUSTMENT', 'RETURN'],
    required: true
  },
  quantityChange: { type: Number, required: true }, // e.g., -5 for a sale, +50 for delivery
  stockBefore: { type: Number, required: true },
  stockAfter: { type: Number, required: true },
  referenceId: { type: String }, // To store the ID of the Sale or Delivery document
  notes: { type: String }, // For manual adjustments
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Movement', movementSchema);