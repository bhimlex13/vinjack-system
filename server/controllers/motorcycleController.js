// server/controllers/motorcycleController.js
const Motorcycle = require('../models/motorcycleModel');
const Customer = require('../models/customerModel');
const Sale = require('../models/saleModel');
const mongoose = require('mongoose');

// A helper function to parse Mongoose duplicate key errors
const getDuplicateKeyErrorMessage = (err) => {
    let message = 'A motorcycle with this value already exists.';
    if (err.keyValue) {
        const key = Object.keys(err.keyValue)[0];
        const value = err.keyValue[key];
        message = `A motorcycle with the ${key} '${value}' already exists.`;
    }
    return message;
};

// @desc    Create a new motorcycle for a customer
// @route   POST /api/motorcycles
const createMotorcycle = async (req, res) => {
  // Destructure the new forceCreate flag
  const { owner, make, model, year, color, plateNumber, vin, forceCreate } = req.body;

  if (!owner || !make || !model) {
    return res.status(400).json({ message: 'Owner, make, and model are required.' });
  }

  // --- NEW: Hard check for unique Plate Number or VIN globally ---
  if (plateNumber) {
    const existingPlate = await Motorcycle.findOne({ plateNumber });
    if (existingPlate) {
      return res.status(409).json({ message: `A motorcycle with Plate Number '${plateNumber}' already exists.` });
    }
  }
  if (vin) {
    const existingVin = await Motorcycle.findOne({ vin });
    if (existingVin) {
      return res.status(409).json({ message: `A motorcycle with VIN '${vin}' already exists.` });
    }
  }
  // --- END OF NEW HARD CHECK ---

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const customer = await Customer.findById(owner).session(session);
    if (!customer) {
      throw new Error('Customer not found.');
    }

    // --- MODIFIED: Soft check for similar motorcycles, now skippable ---
    if (!forceCreate) {
      const existingMotorcycle = await Motorcycle.findOne({
        owner,
        make,
        model,
        year: year || null,
        color: color || null,
      }).session(session);

      if (existingMotorcycle) {
        // Return 409 Conflict with a special flag for the frontend
        return res.status(409).json({ 
          message: 'A motorcycle with the same make, model, year, and color already exists for this customer. Do you want to create it anyway?',
          isSoftDuplicate: true // This flag tells the frontend it's an overridable warning
        });
      }
    }
    // --- END OF MODIFIED SOFT CHECK ---

    const motorcycleData = { owner, make, model };
    if (year) motorcycleData.year = year;
    if (color) motorcycleData.color = color;
    if (plateNumber) motorcycleData.plateNumber = plateNumber;
    if (vin) motorcycleData.vin = vin;
    
    const newMotorcycle = new Motorcycle(motorcycleData);
    const savedMotorcycle = await newMotorcycle.save({ session });

    customer.motorcycles.push(savedMotorcycle._id);
    await customer.save({ session });

    await session.commitTransaction();
    res.status(201).json(savedMotorcycle);

  } catch (error) {
    await session.abortTransaction();
    let errorMessage = 'Error creating motorcycle';
    if (error.code === 11000) {
        errorMessage = getDuplicateKeyErrorMessage(error);
    } else if (error.message) {
        errorMessage = error.message;
    }
    res.status(400).json({ message: errorMessage });
  } finally {
    session.endSession();
  }
};

// ... (rest of the file is unchanged)
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
    const updateData = { ...req.body };
    const unsetData = {};
    const optionalFields = ['plateNumber', 'vin', 'year', 'color'];
    
    optionalFields.forEach(field => {
      if (updateData[field] === null || updateData[field] === '') {
        unsetData[field] = ''; 
        delete updateData[field];
      }
    });

    const updateOperation = { $set: updateData };
    if (Object.keys(unsetData).length > 0) {
      updateOperation.$unset = unsetData;
    }

    const motorcycle = await Motorcycle.findByIdAndUpdate(req.params.id, updateOperation, { new: true, runValidators: true });
    
    if (!motorcycle) {
      return res.status(404).json({ message: 'Motorcycle not found' });
    }
    res.json(motorcycle);
  } catch (error) {
    let errorMessage = 'Error updating motorcycle';
    if (error.code === 11000) {
        errorMessage = getDuplicateKeyErrorMessage(error);
    } else if (error.message) {
        errorMessage = error.message;
    }
    res.status(400).json({ message: errorMessage });
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
    
    const sale = await Sale.findOne({ motorcycle: motorcycle._id }).session(session);
    if (sale) {
        throw new Error('Cannot delete motorcycle. It is associated with existing sales records.');
    }

    await Customer.findByIdAndUpdate(motorcycle.owner, {
      $pull: { motorcycles: motorcycle._id }
    }).session(session);

    await motorcycle.deleteOne({ session });

    await session.commitTransaction();
    res.json({ message: 'Motorcycle removed successfully.' });

  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: error.message || 'Server error deleting motorcycle' });
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