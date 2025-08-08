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
    const { name, contactPerson, contactNumber, address } = req.body;
    const newSupplier = new Supplier({ name, contactPerson, contactNumber, address });
    const savedSupplier = await newSupplier.save();

    // Log the action
    logAction(req.user, 'CREATE_SUPPLIER', `Created new supplier: '${savedSupplier.name}'`);

    res.status(201).json(savedSupplier);
  } catch (error) {
    res.status(400).json({ message: 'Error creating supplier' });
  }
};

const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    
    // Log the action
    logAction(req.user, 'UPDATE_SUPPLIER', `Updated supplier: '${supplier.name}'`);

    res.json(supplier);
  } catch (error) {
    res.status(400).json({ message: 'Error updating supplier' });
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
