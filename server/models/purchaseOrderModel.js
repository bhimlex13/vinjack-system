// server/models/purchaseOrderModel.js
const mongoose = require('mongoose');

// --- (historySchema and purchaseOrderItemSchema remain the same) ---
const historySchema = new mongoose.Schema({
  status: { type: String, required: true },
  notes: { type: String },
  updatedBy: { type: String, default: 'System' },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const purchaseOrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  cost: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true },
  supplierUpdatedCost: { type: Number },
  isAvailable: { type: Boolean, default: true },
  // --- ADDED: To track how many items have been received ---
  quantityReceived: { type: Number, default: 0 }
}, { _id: false });


const purchaseOrderSchema = new mongoose.mongoose.Schema({
  poNumber: { type: String, required: true, unique: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  items: [purchaseOrderItemSchema],
  totalAmount: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Awaiting Approval', 'Approved', 'Partially Received', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  orderDate: { type: Date, default: Date.now },
  notes: { type: String, trim: true },
  supplierResponseToken: { type: String, unique: true, sparse: true },
  supplierNotes: { type: String, trim: true },
  history: [historySchema],
  // --- ADDED: Field to store the path of the uploaded receipt ---
  receiptImageUrl: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);