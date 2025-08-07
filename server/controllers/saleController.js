// server/controllers/saleController.js
const Sale = require('../models/saleModel');
const Product = require('../models/productModel');

// @desc    Create a new sale
// @route   POST /api/sales
const createSale = async (req, res) => {
  const { items, services, totalAmount, recordedBy } = req.body;

  // Basic validation
  if ((!items || items.length === 0) && (!services || services.length === 0)) {
    return res.status(400).json({ message: 'Sale must include at least one item or service.' });
  }

  try {
    // --- Part 1: Handle Inventory Decrement for Products ---
    for (const item of items) {
      const product = await Product.findById(item.product);

      // Check if product exists and has enough stock
      if (!product) {
        throw new Error(`Product with ID ${item.product} not found.`);
      }
      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Only ${product.quantity} left.`);
      }

      // Decrement the quantity
      product.quantity -= item.quantity;
      await product.save();
    }

    // --- Part 2: Create the Sale Record ---
    const sale = new Sale({
      items,
      services,
      totalAmount,
      recordedBy,
    });

    const createdSale = await sale.save();
    res.status(201).json(createdSale);

  } catch (error) {
    // If any error occurs (e.g., insufficient stock), send a bad request response.
    // NOTE: In a real-world, high-traffic system, you'd use database transactions
    // to automatically roll back the inventory changes if the sale creation fails.
    // For this project's scope, this sequential check is sufficient.
    res.status(400).json({ message: error.message });
  }
};

module.exports = { createSale };