// server/controllers/brandController.js
const Brand = require('../models/brandModel');
const Product = require('../models/productModel');
// --- NEW: Import logger ---
const logAction = require('../utils/logger');

const getBrands = async (req, res) => {
  try {
    const brands = await Brand.find({});
    res.status(200).json(brands);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const createBrand = async (req, res) => {
  try {
    const { name } = req.body;
    const newBrand = new Brand({ name });
    const savedBrand = await newBrand.save();

    // --- NEW: Log action ---
    logAction(
      req.user,
      'CREATE_BRAND',
      `Created brand: '${savedBrand.name}'`,
      { entityType: 'Brand', entityId: savedBrand._id }
    );

    res.status(201).json(savedBrand);
  } catch (error) {
    res.status(400).json({ message: 'Error creating brand', error: error.message });
  }
};

const updateBrand = async (req, res) => {
    try {
        const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!brand) return res.status(4404).json({ message: 'Brand not found' });
        
        // --- NEW: Log action ---
        logAction(
          req.user,
          'UPDATE_BRAND',
          `Updated brand: '${brand.name}'`,
          { entityType: 'Brand', entityId: brand._id }
        );

        res.json(brand);
    } catch (error) {
        res.status(400).json({ message: 'Error updating brand' });
    }
};

const deleteBrand = async (req, res) => {
    try {
        const product = await Product.findOne({ brand: req.params.id });
        if (product) {
            return res.status(400).json({ message: 'Cannot delete brand. It is currently in use by a product.' });
        }
        const brand = await Brand.findByIdAndDelete(req.params.id);
        if (!brand) return res.status(404).json({ message: 'Brand not found' });

        // --- NEW: Log action ---
        logAction(
          req.user,
          'DELETE_BRAND',
          `Deleted brand: '${brand.name}'`,
          { entityType: 'Brand', entityId: brand._id }
        );

        res.json({ message: 'Brand removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { getBrands, createBrand, updateBrand, deleteBrand };