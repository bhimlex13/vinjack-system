// server/models/productModel.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  itemCode: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  price: { type: Number, required: true, min: 0 }, // Selling price
  quantity: { type: Number, required: true, default: 0, min: 0 }, // This is the TOTAL physical stock
  
  // --- NEW ---
  // This tracks the portion of the total 'quantity' that is on consignment.
  // The stock you own = (quantity - consignedStock)
  consignedStock: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  // --- END NEW ---

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
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  unit: { type: String, default: 'pc' },
  image: { type: String, trim: true, default: '' },
  supplierCosts: [{
    _id: false,
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    cost: { type: Number, required: true, min: 0 },
  }],
  defaultCost: { type: Number, min: 0, default: 0 },

}, { timestamps: true });


module.exports = mongoose.model('Product', productSchema);