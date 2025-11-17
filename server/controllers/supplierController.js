// server/controllers/supplierController.js
const Supplier = require('../models/supplierModel');
const logAction = require('../utils/logger');

const getSuppliers = async (req, res) => {
  try {
    // --- UPDATED: Added sort by name ---
    const suppliers = await Supplier.find({}).sort({ name: 1 });
    // --- END UPDATED ---
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const createSupplier = async (req, res) => {
  try {
    // --- UPDATED: Changed 'paymentTerms' to 'defaultPaymentTerms' ---
    const { name, email, contactPerson, contactNumber, address, status, defaultPaymentTerms } = req.body;
    
    const newSupplier = new Supplier({ 
      name, 
      email, 
      contactPerson, 
      contactNumber, 
      address, 
      status: status || 'Pending',
      defaultPaymentTerms: defaultPaymentTerms || 'Cash' // Use correct field name
    });
    // --- END UPDATE ---
    
    const savedSupplier = await newSupplier.save();

    // Log the action
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
    // --- UPDATED: req.body will now also contain defaultPaymentTerms ---
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true 
    });
    // --- END UPDATE ---

    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    
    // Log the action
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
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    // Log the action
    logAction(req.user, 'DELETE_SUPPLIER', `Deleted supplier: '${supplier.name}'`);

    res.json({ message: 'Supplier removed' });
  } catch (error) {
    // A more robust check should be added here to see if supplier is in use
    // in Products, POs, or Deliveries before deleting.
    console.error("Error deleting supplier: ", error);
    res.status(400).json({ message: 'Error deleting supplier. They may be in use in other records.' });
  }
};

module.exports = { getSuppliers, createSupplier, updateSupplier, deleteSupplier };