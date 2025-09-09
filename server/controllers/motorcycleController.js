// server/controllers/motorcycleController.js
const Motorcycle = require('../models/motorcycleModel');
const Customer = require('../models/customerModel');
const Sale = require('../models/saleModel');
const mongoose = require('mongoose');

// @desc    Create a new motorcycle for a customer
// @route   POST /api/motorcycles
const createMotorcycle = async (req, res) => {
  const { owner, make, model, year, color, plateNumber, vin } = req.body;

  if (!owner || !make || !model) {
    return res.status(400).json({ message: 'Owner, make, and model are required.' });
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const customer = await Customer.findById(owner).session(session);
    if (!customer) {
      throw new Error('Customer not found.');
    }

    const newMotorcycle = new Motorcycle({ owner, make, model, year, color, plateNumber, vin });
    const savedMotorcycle = await newMotorcycle.save({ session });

    // Add the new motorcycle's ID to the customer's list of motorcycles
    customer.motorcycles.push(savedMotorcycle._id);
    await customer.save({ session });

    await session.commitTransaction();
    res.status(201).json(savedMotorcycle);

  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: 'Error creating motorcycle', error: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Get all motorcycles for a specific customer
// @route   GET /api/motorcycles/customer/:customerId
const getMotorcyclesByCustomer = async (req, res) => {
  try {
    const motorcycles = await Motorcycle.find({ owner: req.params.customerId });
    res.json(motorcycles);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching motorcycles' });
  }
};

// @desc    Update a motorcycle
// @route   PUT /api/motorcycles/:id
const updateMotorcycle = async (req, res) => {
  try {
    const motorcycle = await Motorcycle.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!motorcycle) {
      return res.status(404).json({ message: 'Motorcycle not found' });
    }
    res.json(motorcycle);
  } catch (error) {
    res.status(400).json({ message: 'Error updating motorcycle', error: error.message });
  }
};

// @desc    Delete a motorcycle
// @route   DELETE /api/motorcycles/:id
const deleteMotorcycle = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const motorcycle = await Motorcycle.findById(req.params.id).session(session);
    if (!motorcycle) {
      throw new Error('Motorcycle not found.');
    }
    
    // Safety check: prevent deletion if linked to a sale
    const sale = await Sale.findOne({ motorcycle: motorcycle._id }).session(session);
    if (sale) {
        throw new Error('Cannot delete motorcycle. It is associated with existing sales records.');
    }

    // Remove the motorcycle's ID from the owner's array
    await Customer.findByIdAndUpdate(motorcycle.owner, {
      $pull: { motorcycles: motorcycle._id }
    }).session(session);

    await motorcycle.deleteOne({ session });

    await session.commitTransaction();
    res.json({ message: 'Motorcycle removed successfully.' });

  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Server error deleting motorcycle', error: error.message });
  } finally {
    session.endSession();
  }
};


module.exports = {
  createMotorcycle,
  getMotorcyclesByCustomer,
  updateMotorcycle,
  deleteMotorcycle,
};