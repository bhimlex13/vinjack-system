// server/controllers/productController.js
const Product = require('../models/productModel');
const logAction = require('../utils/logger');
const logMovement = require('../utils/movementLogger'); 

const getProducts = async (req, res) => {
  try {
    const products = await Product.find({}).populate('category').populate('brand');
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, itemCode, category, brand, cost, price, quantity, unit, reorderLevel, image } = req.body;
    const newProduct = new Product({ name, itemCode, category, brand, cost, price, quantity, unit, reorderLevel, image });
    const savedProduct = await newProduct.save();
    
    // Log the initial stock as an ADJUSTMENT
    if (savedProduct.quantity > 0) {
      await logMovement({
        product: savedProduct._id,
        type: 'ADJUSTMENT',
        quantityChange: savedProduct.quantity,
        stockBefore: 0,
        notes: 'Initial stock from product creation.',
        recordedBy: req.user.id
      });
    }

    logAction(req.user, 'CREATE_PRODUCT', `Created product: '${savedProduct.name}' (Code: ${savedProduct.itemCode})`);

    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ message: 'Error creating product', error: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      // --- CAPTURE these values before making changes ---
      const stockBefore = product.quantity;
      const newQuantity = req.body.quantity;

      // --- UPDATE the product object in memory ---
      product.name = req.body.name || product.name;
      product.itemCode = req.body.itemCode || product.itemCode;
      product.category = req.body.category || product.category;
      product.brand = req.body.brand || product.brand;
      product.cost = req.body.cost ?? product.cost;
      product.price = req.body.price ?? product.price;
      product.quantity = newQuantity ?? product.quantity;
      product.reorderLevel = req.body.reorderLevel ?? product.reorderLevel;
      product.image = req.body.image || product.image;
      
      // --- SAVE the product to the database ---
      const updatedProduct = await product.save();

      // --- LOG the movement if the quantity has been manually changed ---
      // This is done after saving to ensure the update was successful
      if (newQuantity !== undefined && stockBefore !== newQuantity) {
        await logMovement({
          product: product._id,
          type: 'ADJUSTMENT',
          quantityChange: newQuantity - stockBefore,
          stockBefore,
          notes: 'Manual stock update from product form.',
          recordedBy: req.user.id
        });
      }

      logAction(req.user, 'UPDATE_PRODUCT', `Updated product: '${updatedProduct.name}' (Code: ${updatedProduct.itemCode})`);
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error)
 {
    res.status(400).json({ message: 'Error updating product', error: error.message });
  }
};

const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            await product.deleteOne();
            logAction(req.user, 'DELETE_PRODUCT', `Deleted product: '${product.name}' (Code: ${product.itemCode})`);
            res.json({ message: 'Product removed' });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

const getLowStockProducts = async (req, res) => {
  try {
    const lowStockProducts = await Product.find({
      $expr: { $lte: ['$quantity', '$reorderLevel'] }
    });
    res.json(lowStockProducts);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { 
  getProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  getLowStockProducts,
};