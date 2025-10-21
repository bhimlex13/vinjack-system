// server/models/productModel.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  itemCode: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  cost: { type: Number, required: true, min: 0 }, 
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, default: 0, min: 0 },
  
  // --- NEW FIELDS START ---
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
  
  // --- NEW FIELDS END ---

  unit: { type: String, default: 'pc' }, 
  reorderLevel: { type: Number, default: 5, min: 0 }, // We can keep this
  image: { type: String, trim: true, default: '' },

  suppliers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  }]

}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);