// server/controllers/supplierController.js
const Supplier = require('../models/supplierModel');
const logAction = require('../utils/logger'); // <-- Import the logger

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
    // --- ADDED email ---
    const { name, email, contactPerson, contactNumber, address } = req.body;
    // --- ADDED email ---
    const newSupplier = new Supplier({ name, email, contactPerson, contactNumber, address });
    const savedSupplier = await newSupplier.save();

    // Log the action
    logAction(req.user, 'CREATE_SUPPLIER', `Created new supplier: '${savedSupplier.name}'`);

    res.status(201).json(savedSupplier);
  } catch (error) {
    // Basic duplicate name check
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
       return res.status(400).json({ message: 'Supplier name already exists.' });
    }
    // Basic email validation check from model
    if (error.errors && error.errors.email) {
        return res.status(400).json({ message: error.errors.email.message });
    }
    res.status(400).json({ message: 'Error creating supplier', error: error.message });
  }
};

const updateSupplier = async (req, res) => {
  try {
    // req.body will contain the email field if it's sent from the form
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true // Ensure email validation runs on update
    });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    
    // Log the action
    logAction(req.user, 'UPDATE_SUPPLIER', `Updated supplier: '${supplier.name}'`);

    res.json(supplier);
  } catch (error) {
     // Basic email validation check from model
    if (error.errors && error.errors.email) {
        return res.status(400).json({ message: error.errors.email.message });
    }
     // Basic duplicate name check
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
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { getSuppliers, createSupplier, updateSupplier, deleteSupplier };