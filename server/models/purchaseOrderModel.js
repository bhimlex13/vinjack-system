// server/models/purchaseOrderModel.js
const mongoose = require('mongoose');

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
  quantityReceived: { type: Number, default: 0 }
}, { _id: false });


const purchaseOrderSchema = new mongoose.mongoose.Schema({
  poNumber: { type: String, required: true, unique: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  items: [purchaseOrderItemSchema],
  totalAmount: { type: Number, required: true, min: 0 },
  
  // --- NEW ---
  // This is the main toggle for the new feature
  poType: {
    type: String,
    enum: ['Purchase', 'Consignment'],
    default: 'Purchase',
    required: true
  },
  // --- END NEW ---

  status: {
    type: String,
    required: true,
    enum: [
      'Pending', 
      'Awaiting Approval', 
      'Approved', 
      'Partially Received', 
      'Completed', 
      'Cancelled',
      // --- NEW STATUS ---
      'Agreement Uploaded - Awaiting Delivery' // New status for the PDF flow
      // --- END NEW STATUS ---
    ],
    default: 'Pending'
  },
  orderDate: { type: Date, default: Date.now },
  notes: { type: String, trim: true },
  supplierResponseToken: { type: String, unique: true, sparse: true },
  supplierNotes: { type: String, trim: true },
  history: [historySchema],
  
  // --- UPDATED ---
  // Renamed this field for clarity, to distinguish from the agreement
  deliveryReceiptUrl: { type: String },
  // --- END UPDATED ---

  // --- NEW ---
  // This will store the path to the signed PDF agreement
  signedAgreementUrl: { 
    type: String, 
    trim: true 
  }
  // --- END NEW ---

}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);