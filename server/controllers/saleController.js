// server/controllers/saleController.js
const Sale = require('../models/saleModel');
const Product = require('../models/productModel');
const logAction = require('../utils/logger'); // <-- Import the logger

// @desc    Create a new sale
// @route   POST /api/sales
const createSale = async (req, res) => {
  const { items, services, totalAmount, recordedBy } = req.body;

  if ((!items || items.length === 0) && (!services || services.length === 0)) {
    return res.status(400).json({ message: 'Sale must include at least one item or service.' });
  }

  try {
    // --- Part 1: Handle Inventory Decrement ---
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`Product with ID ${item.product} not found.`);
      }
      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Only ${product.quantity} left.`);
      }
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

    // --- Part 3: Log the Action ---
    logAction(
      req.user, 
      'PROCESS_SALE', 
      `Processed sale with ${items.length} item type(s) for a total of ₱${totalAmount.toFixed(2)}.`
    );

    res.status(201).json(createdSale);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { createSale };
