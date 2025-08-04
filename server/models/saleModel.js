const mongoose = require('mongoose');
const saleSchema = new mongoose.Schema({
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: Number,
        priceAtTime: Number,
    }],
    totalAmount: { type: Number, required: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerReceiptImage: { type: String }, 
    isManualEntry: { type: Boolean, default: false },
}, { timestamps: true });
module.exports = mongoose.model('Sale', saleSchema);