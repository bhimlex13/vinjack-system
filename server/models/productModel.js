// server/models/productModel.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  itemCode: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  price: { type: Number, required: true, min: 0 }, // Selling price
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
  image: { type: String, trim: true, default: '' },
  supplierCosts: [{
    _id: false,
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    cost: { type: Number, required: true, min: 0 },
  }],
  // defaultCost is now set via the form, not automatically
  defaultCost: { type: Number, min: 0, default: 0 },

}, { timestamps: true });

// --- REMOVED PRE-SAVE HOOK ---
// productSchema.pre('save', function(next) {
//   if (this.supplierCosts && this.supplierCosts.length > 0) {
//     this.defaultCost = this.supplierCosts[0].cost;
//   } else {
//     this.defaultCost = 0;
//   }
//   next();
// });
// --- END REMOVAL ---

module.exports = mongoose.model('Product', productSchema);