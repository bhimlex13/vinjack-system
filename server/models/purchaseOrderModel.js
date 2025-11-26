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
  quantityReceived: { type: Number, default: 0 },
  
  // Store Serial Numbers for this specific batch
  serialNumbers: [{ type: String }] 

}, { _id: false });


const purchaseOrderSchema = new mongoose.Schema({
  poNumber: { type: String, required: true, unique: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  items: [purchaseOrderItemSchema],
  totalAmount: { type: Number, required: true, min: 0 },
  
  poType: {
    type: String,
    enum: ['Purchase', 'Consignment'],
    default: 'Purchase',
    required: true
  },

  // Distinguish the flow
  consignmentMethod: {
    type: String,
    enum: ['System', 'Manual'], 
    default: 'System'
  },
  
  // Store custom terms for System-generated agreements
  termsAndConditions: {
    type: String,
    default: ''
  },

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
      'Agreement Uploaded - Awaiting Delivery' 
    ],
    default: 'Pending'
  },
  orderDate: { type: Date, default: Date.now },
  notes: { type: String, trim: true },
  supplierResponseToken: { type: String, unique: true, sparse: true },
  supplierNotes: { type: String, trim: true },
  history: [historySchema],
  
  deliveryReceiptUrl: { type: String },

  // The Supplier's Signed PDF
  signedAgreementUrl: { 
    type: String, 
    trim: true 
  },

  // The Owner's Countersigned PDF (Final)
  countersignedAgreementUrl: { 
    type: String, 
    trim: true 
  }

}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);