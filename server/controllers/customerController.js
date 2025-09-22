// server/controllers/customerController.js
const Customer = require('../models/customerModel');
const Sale = require('../models/saleModel');
const logAction = require('../utils/logger');

// @desc    Create a new customer
// @route   POST /api/customers
const createCustomer = async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Customer name is required.' });
    }
    const newCustomer = new Customer({ name, email, phone, address });
    const savedCustomer = await newCustomer.save();
    logAction(req.user, 'CREATE_CUSTOMER', `Created new customer: '${savedCustomer.name}'`);

    // --- ADDED: Emit a real-time event to all clients ---
    const io = req.app.get('socketio');
    io.emit('customer_added', savedCustomer);

    res.status(201).json(savedCustomer);
  } catch (error) {
    res.status(400).json({ message: 'Error creating customer', error: error.message });
  }
};

// @desc    Get all customers
// @route   GET /api/customers
const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({}).sort('name');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching customers', error: error.message });
  }
};

// @desc    Get a single customer by ID
// @route   GET /api/customers/:id
const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching customer', error: error.message });
  }
};

// @desc    Update a customer
// @route   PUT /api/customers/:id
const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    logAction(req.user, 'UPDATE_CUSTOMER', `Updated customer: '${customer.name}'`);
    res.json(customer);
  } catch (error) {
    res.status(400).json({ message: 'Error updating customer', error: error.message });
  }
};

// @desc    Delete a customer
// @route   DELETE /api/customers/:id
const deleteCustomer = async (req, res) => {
  try {
    const sale = await Sale.findOne({ customer: req.params.id });
    if (sale) {
      return res.status(400).json({ message: 'Cannot delete customer. They are associated with existing sales.' });
    }

    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    logAction(req.user, 'DELETE_CUSTOMER', `Deleted customer: '${customer.name}'`);
    res.json({ message: 'Customer removed successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting customer', error: error.message });
  }
};

module.exports = {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
};