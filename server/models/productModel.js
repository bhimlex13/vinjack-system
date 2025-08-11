const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  itemCode: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  cost: { type: Number, required: true, min: 0 }, 
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, default: 0, min: 0 },
  unit: { type: String, default: 'pc' }, 
  reorderLevel: { type: Number, default: 5, min: 0 },
  image: { type: String, trim: true, default: '' }, // <-- RENAMED from imageUrl
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);