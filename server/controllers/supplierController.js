// server/controllers/supplierController.js
const Supplier = require('../models/supplierModel');
const Product = require('../models/productModel');
const mongoose = require('mongoose');
// --- NEW: Import models for order history ---
const PurchaseOrder = require('../models/purchaseOrderModel');
const Delivery = require('../models/deliveryModel');
// --- END NEW ---
const logAction = require('../utils/logger');

const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({}).sort({ name: 1 });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const createSupplier = async (req, res) => {
  try {
    const { name, email, contactPerson, contactNumber, address, status, defaultPaymentTerms } = req.body;
    
    const newSupplier = new Supplier({ 
      name, 
      email, 
      contactPerson, 
      contactNumber, 
      address, 
      status: status || 'Pending',
      defaultPaymentTerms: defaultPaymentTerms || 'Cash'
    });
    
    const savedSupplier = await newSupplier.save();
    logAction(req.user, 'CREATE_SUPPLIER', `Created new supplier: '${savedSupplier.name}' (Status: ${savedSupplier.status})`);
    res.status(201).json(savedSupplier);
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
       return res.status(400).json({ message: 'Supplier name already exists.' });
    }
    if (error.errors && error.errors.email) {
        return res.status(400).json({ message: error.errors.email.message });
    }
    res.status(400).json({ message: 'Error creating supplier', error: error.message });
  }
};

const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true 
    });

    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    
    logAction(req.user, 'UPDATE_SUPPLIER', `Updated supplier: '${supplier.name}'`);
    res.json(supplier);
  } catch (error) {
     if (error.errors && error.errors.email) {
        return res.status(400).json({ message: error.errors.email.message });
    }
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
       return res.status(400).json({ message: 'Supplier name already exists.' });
    }
    res.status(400).json({ message: 'Error updating supplier', error: error.message });
  }
};

const deleteSupplier = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const supplierId = req.params.id;
    const supplier = await Supplier.findByIdAndDelete(supplierId, { session });
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    await Product.updateMany(
      { 'supplierCosts.supplier': supplierId },
      { $pull: { supplierCosts: { supplier: supplierId } } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    logAction(req.user, 'DELETE_SUPPLIER', `Deleted supplier: '${supplier.name}'`);
    res.json({ message: 'Supplier removed' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error deleting supplier: ", error);
    res.status(400).json({ message: 'Error deleting supplier. They may be in use in other records.' });
  }
};

const getSupplierProductCatalog = async (req, res) => {
  try {
    const supplierId = req.params.id;
    
    const products = await Product.find({ 'supplierCosts.supplier': supplierId }).lean();
    
    const catalog = products.map(product => {
      const costEntry = product.supplierCosts.find(
        sc => sc.supplier.toString() === supplierId
      );
      
      // --- MODIFIED: Also return the note ---
      return {
        product: product,
        cost: costEntry ? costEntry.cost : 0,
        note: costEntry ? costEntry.note : '' // <-- ADDED
      };
      // --- END MODIFICATION ---
    });

    res.json(catalog);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const updateSupplierProductCatalog = async (req, res) => {
  const supplierId = req.params.id;
  // --- MODIFIED: Expect 'note' in the payload ---
  const { products: newCatalog } = req.body; // Array of { product: 'productId', cost: 123, note: '...' }
  // --- END MODIFICATION ---
  
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!Array.isArray(newCatalog)) {
      throw new Error('Invalid product catalog format.');
    }

    const newProductIds = new Set(newCatalog.map(item => item.product));

    // 1. REMOVE supplier from any products that are NO LONGER in the new catalog
    await Product.updateMany(
      { 
        'supplierCosts.supplier': supplierId,
        _id: { $nin: Array.from(newProductIds) }
      },
      { $pull: { supplierCosts: { supplier: supplierId } } },
      { session }
    );

    // 2. ADD/UPDATE supplier for all products that ARE in the new catalog
    for (const item of newCatalog) {
      // --- MODIFIED: Get 'note' from item ---
      const { product: productId, cost, note } = item;
      // --- END MODIFICATION ---
      
      // Try to update the cost/note if the supplier entry already exists
      const updateResult = await Product.updateOne(
        { _id: productId, 'supplierCosts.supplier': supplierId },
        // --- MODIFIED: Update both cost and note ---
        { $set: { 'supplierCosts.$.cost': cost, 'supplierCosts.$.note': note } },
        // --- END MODIFICATION ---
        { session }
      );

      // If no document was matched, it means this is a NEW product for this supplier
      if (updateResult.matchedCount === 0) {
        await Product.updateOne(
          { _id: productId },
          // --- MODIFIED: Push new entry with cost and note ---
          { $push: { supplierCosts: { supplier: supplierId, cost: cost, note: note } } },
          // --- END MODIFICATION ---
          { session }
        );
      }
    }
    
    await session.commitTransaction();
    session.endSession();
    
    logAction(req.user, 'UPDATE_SUPPLIER', `Updated product catalog for supplier ID: ${supplierId}`);
    res.json({ message: 'Supplier product catalog updated successfully.' });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: 'Error updating supplier catalog', error: error.message });
  }
};

// --- NEW FUNCTION: Get order history for a specific supplier ---
const getSupplierOrderHistory = async (req, res) => {
  try {
    const supplierId = req.params.id;

    // 1. Find Purchase Orders
    const poHistory = await PurchaseOrder.find({ supplier: supplierId })
      .select('poNumber status totalAmount createdAt poType')
      .sort({ createdAt: -1 })
      .limit(50) // Limit to last 50
      .lean(); // Use .lean() for faster, plain objects

    // 2. Find Direct Deliveries
    const deliveryHistory = await Delivery.find({ supplier: supplierId })
      .select('totalCost createdAt')
      .sort({ createdAt: -1 })
      .limit(50) // Limit to last 50
      .lean();

    // 3. Format and combine histories
    const formattedPOs = poHistory.map(po => ({
      _id: po._id,
      date: po.createdAt,
      // Determine type based on poType
      type: po.poType === 'Consignment' ? 'PO (Consignment)' : 'PO (Purchase)',
      reference: po.poNumber,
      status: po.status,
      amount: po.totalAmount
    }));

    const formattedDeliveries = deliveryHistory.map(d => ({
      _id: d._id,
      date: d.createdAt,
      type: 'Direct Delivery',
      reference: 'Direct', // Direct deliveries don't have a PO number
      status: 'Completed',
      amount: d.totalCost
    }));

    // Combine and sort by date descending
    const combinedHistory = [...formattedPOs, ...formattedDeliveries];
    combinedHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(combinedHistory.slice(0, 100)); // Send the most recent 100 entries
  } catch (error) {
    console.error("Error fetching supplier history:", error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
// --- END NEW FUNCTION ---

module.exports = { 
  getSuppliers, 
  createSupplier, 
  updateSupplier, 
  deleteSupplier,
  getSupplierProductCatalog,
  updateSupplierProductCatalog,
  // --- EXPORT NEW FUNCTION ---
  getSupplierOrderHistory
};