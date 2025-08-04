const Brand = require('../models/brandModel');

// @desc    Get all brands
// @route   GET /api/brands
const getBrands = async (req, res) => {
  try {
    const brands = await Brand.find({});
    res.status(200).json(brands);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a brand
// @route   POST /api/brands
const createBrand = async (req, res) => {
  try {
    const { name } = req.body;
    const newBrand = new Brand({ name });
    const savedBrand = await newBrand.save();
    res.status(201).json(savedBrand);
  } catch (error) {
    res.status(400).json({ message: 'Error creating brand', error: error.message });
  }
};

module.exports = { getBrands, createBrand }; // <-- Add createBrand here