// server/controllers/customerController.js
const Customer = require('../models/customerModel');
const Sale = require('../models/saleModel');
const logAction = require('../utils/logger');

const createCustomer = async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Customer name is required.' });
    }

    const customerData = {
      name,
      phone,
      address,
      ...(email && { email }),
    };

    const newCustomer = new Customer(customerData);
    const savedCustomer = await newCustomer.save();

    logAction(req.user, 'CREATE_CUSTOMER', `Created new customer: '${savedCustomer.name}'`, { entityType: 'Customer', entityId: savedCustomer._id });

    const io = req.app.get('socketio');
    io.emit('customer_added', savedCustomer);

    res.status(201).json(savedCustomer);
  } catch (error) {
    res.status(400).json({ message: 'Error creating customer', error: error.message });
  }
};

const getAllCustomers = async (req, res) => {
  try {
    // --- THIS IS THE FIX ---
    // We now populate the 'motorcycles' field and only select the 'make', 'model', and 'plateNumber'.
    const customers = await Customer.find({})
      .sort('name')
      .populate('motorcycles', 'make model plateNumber');
    // --- END OF FIX ---
    
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching customers', error: error.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    // --- ALSO UPDATING THIS function to be consistent ---
    const customer = await Customer.findById(req.params.id)
      .populate('motorcycles', 'make model plateNumber');
    // --- END UPDATE ---

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching customer', error: error.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    if (updateData.email === '') {
      updateData.email = null;
    }

    const customer = await Customer.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    logAction(req.user, 'UPDATE_CUSTOMER', `Updated customer: '${customer.name}'`, { entityType: 'Customer', entityId: customer._id });
    
    // --- ALSO UPDATING THIS response to be consistent ---
    const populatedCustomer = await Customer.findById(customer._id)
      .populate('motorcycles', 'make model plateNumber');
    // --- END UPDATE ---

    res.json(populatedCustomer);
  } catch (error) {
    res.status(400).json({ message: 'Error updating customer', error: error.message });
  }
};

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
    logAction(req.user, 'DELETE_CUSTOMER', `Deleted customer: '${customer.name}'`, { entityType: 'Customer', entityId: customer._id });
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