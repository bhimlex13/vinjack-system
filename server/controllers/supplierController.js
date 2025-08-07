// server/controllers/supplierController.js
const Supplier = require('../models/supplierModel');

// @desc    Get all suppliers
// @route   GET /api/suppliers
const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({});
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a new supplier
// @route   POST /api/suppliers
const createSupplier = async (req, res) => {
  try {
    const { name, contactPerson, contactNumber, address } = req.body;
    const newSupplier = new Supplier({ name, contactPerson, contactNumber, address });
    const savedSupplier = await newSupplier.save();
    res.status(201).json(savedSupplier);
  } catch (error) {
    res.status(400).json({ message: 'Error creating supplier' });
  }
};

// @desc    Update a supplier
// @route   PUT /api/suppliers/:id
const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json(supplier);
  } catch (error) {
    res.status(400).json({ message: 'Error updating supplier' });
  }
};

// @desc    Delete a supplier
// @route   DELETE /api/suppliers/:id
const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json({ message: 'Supplier removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// We will add update and delete functions later when building the UI
module.exports = { getSuppliers, createSupplier, updateSupplier, deleteSupplier };