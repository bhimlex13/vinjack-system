// server/models/productModel.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  itemCode: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  // REMOVED: cost: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 }, // Selling price remains
  quantity: { type: Number, required: true, default: 0, min: 0 },

  maxStock: {
    type: Number,
    required: [true, 'Max stock capacity is required'],
    default: 1,
    min: [1, 'Max stock must be at least 1']
  },
  stockStatus: {
    type: String,
    enum: ['Healthy', 'Low', 'Critical', 'Out of Stock'],
    default: 'Out of Stock'
  },

  unit: { type: String, default: 'pc' },
  // reorderLevel: { type: Number, default: 5, min: 0 }, // Removed based on previous discussion
  image: { type: String, trim: true, default: '' },

  // --- MODIFICATION START ---
  // Store cost per supplier
  supplierCosts: [{
    _id: false, // Don't create automatic _id for subdocuments
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    cost: { type: Number, required: true, min: 0 },
    // Optional: Add supplier's specific item code if needed
    // supplierItemCode: { type: String, trim: true }
  }],

  // Optional: Keep a general cost for reference (e.g., last cost or average cost)
  defaultCost: { type: Number, min: 0, default: 0 },
  // --- MODIFICATION END ---

  // suppliers field is now implicitly defined by supplierCosts, REMOVE the old one
  // REMOVED: suppliers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' }]

}, { timestamps: true });

// --- Optional: Middleware to update defaultCost ---
// This example sets defaultCost to the cost of the first supplier, or 0
productSchema.pre('save', function(next) {
  if (this.supplierCosts && this.supplierCosts.length > 0) {
    // Example: Set defaultCost to the cost from the first supplier in the list
    this.defaultCost = this.supplierCosts[0].cost;
    // Or you could calculate an average, or use the last updated cost etc.
  } else {
    this.defaultCost = 0;
  }
  next();
});


module.exports = mongoose.model('Product', productSchema);