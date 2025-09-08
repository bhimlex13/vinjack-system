// server/controllers/serviceController.js
const Service = require('../models/serviceModel');
const Sale = require('../models/saleModel');
const logAction = require('../utils/logger');

// @desc    Get all services
// @route   GET /api/services
const getServices = async (req, res) => {
  try {
    // If a 'status' query is passed (e.g., ?status=active), filter by it
    const filter = req.query.status ? { status: req.query.status } : {};
    const services = await Service.find(filter).sort('name');
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create a new service
// @route   POST /api/services
const createService = async (req, res) => {
  try {
    const { name, description, charge } = req.body;
    const newService = new Service({ name, description, charge });
    const savedService = await newService.save();
    logAction(req.user, 'CREATE_SERVICE', `Created service: '${savedService.name}'`);
    res.status(201).json(savedService);
  } catch (error) {
    res.status(400).json({ message: 'Error creating service', error: error.message });
  }
};

// @desc    Update an existing service
// @route   PUT /api/services/:id
const updateService = async (req, res) => {
    try {
        const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!service) {
          return res.status(404).json({ message: 'Service not found' });
        }
        logAction(req.user, 'UPDATE_SERVICE', `Updated service: '${service.name}'`);
        res.json(service);
    } catch (error) {
        res.status(400).json({ message: 'Error updating service', error: error.message });
    }
};

// @desc    Delete a service
// @route   DELETE /api/services/:id
const deleteService = async (req, res) => {
    try {
        // Check if the service is being used in any sale
        const sale = await Sale.findOne({ "services.service": req.params.id });
        if (sale) {
            return res.status(400).json({ message: 'Cannot delete service. It is used in existing sales records.' });
        }

        const service = await Service.findByIdAndDelete(req.params.id);
        if (!service) {
          return res.status(404).json({ message: 'Service not found' });
        }
        logAction(req.user, 'DELETE_SERVICE', `Deleted service: '${service.name}'`);
        res.json({ message: 'Service removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// This export block correctly bundles all the functions
module.exports = {
    getServices,
    createService,
    updateService,
    deleteService,
};