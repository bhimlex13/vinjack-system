// server/controllers/productController.js
const Product = require('../models/productModel');

// @desc    Get all products
// @route   GET /api/products
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({}).populate('category').populate('brand');
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create a product
// @route   POST /api/products
const createProduct = async (req, res) => {
  try {
    const { name, itemCode, category, brand, cost, price, quantity, unit, reorderLevel } = req.body;
    const newProduct = new Product({ name, itemCode, category, brand, cost, price, quantity, unit, reorderLevel });
    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ message: 'Error creating product', error: error.message });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      // Update fields from request body
      product.name = req.body.name || product.name;
      product.itemCode = req.body.itemCode || product.itemCode;
      product.category = req.body.category || product.category;
      product.brand = req.body.brand || product.brand;
      product.cost = req.body.cost || product.cost;
      product.price = req.body.price || product.price;
      product.quantity = req.body.quantity || product.quantity;
      //... and so on for other fields

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Error updating product', error: error.message });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      await product.deleteOne();
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Export the new functions
module.exports = { getProducts, createProduct, updateProduct, deleteProduct };