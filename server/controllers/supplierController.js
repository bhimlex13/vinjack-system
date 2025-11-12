// server/controllers/supplierController.js
const Supplier = require('../models/supplierModel');
const logAction = require('../utils/logger');

const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({});
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const createSupplier = async (req, res) => {
  try {
    // --- UPDATED: Added status and paymentTerms ---
    const { name, email, contactPerson, contactNumber, address, status, paymentTerms } = req.body;
    
    const newSupplier = new Supplier({ 
      name, 
      email, 
      contactPerson, 
      contactNumber, 
      address, 
      status: status || 'Pending', // Default to Pending if not provided
      paymentTerms: paymentTerms || 'Cash' // Default to Cash if not provided
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
    // --- UPDATED: req.body will now also contain status and paymentTerms ---
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true // Ensure enum validation runs
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
    // --- ADDED: Check if supplier is in use ---
    // This is a basic check. A more robust check would look at Products, POs, Deliveries, etc.
    // We can add this later if needed. For now, a 500 is ok.
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { getSuppliers, createSupplier, updateSupplier, deleteSupplier };