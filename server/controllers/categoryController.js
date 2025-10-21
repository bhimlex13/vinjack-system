// server/controllers/categoryController.js
const Category = require('../models/categoryModel');
const Product = require('../models/productModel');
// --- NEW: Import logger ---
const logAction = require('../utils/logger');

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({});
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const newCategory = new Category({ name, description });
    const savedCategory = await newCategory.save();
    
    // --- NEW: Log action ---
    logAction(
      req.user, 
      'CREATE_CATEGORY', 
      `Created category: '${savedCategory.name}'`, 
      { entityType: 'Category', entityId: savedCategory._id }
    );

    res.status(201).json(savedCategory);
  } catch (error)
 {
    res.status(400).json({ message: 'Error creating category', error: error.message });
  }
};

const updateCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!category) return res.status(404).json({ message: 'Category not found' });
        
        // --- NEW: Log action ---
        logAction(
          req.user, 
          'UPDATE_CATEGORY', 
          `Updated category: '${category.name}'`, 
          { entityType: 'Category', entityId: category._id }
        );

        res.json(category);
    } catch (error) {
        res.status(400).json({ message: 'Error updating category' });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const product = await Product.findOne({ category: req.params.id });
        if (product) {
            return res.status(400).json({ message: 'Cannot delete category. It is currently in use by a product.' });
        }
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });
        
        // --- NEW: Log action ---
        logAction(
          req.user, 
          'DELETE_CATEGORY', 
          `Deleted category: '${category.name}'`, 
          { entityType: 'Category', entityId: category._id }
        );

        res.json({ message: 'Category removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };