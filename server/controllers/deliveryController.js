// server/controllers/deliveryController.js
const Delivery = require('../models/deliveryModel');
const Product = require('../models/productModel');

// @desc    Create a new delivery
// @route   POST /api/deliveries
const createDelivery = async (req, res) => {
  const { supplier, productsReceived, recordedBy } = req.body;

  if (!productsReceived || productsReceived.length === 0) {
    return res.status(400).json({ message: 'Delivery must include at least one product.' });
  }

  try {
    // --- Part 1: Update Inventory Stock ---
    for (const item of productsReceived) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`Product with ID ${item.product} not found.`);
      }
      
      // Increase the product's quantity
      product.quantity += item.quantity;
      
      // Optional: Update the product's cost to the latest delivery cost
      product.cost = item.costAtTime;

      await product.save();
    }

    // --- Part 2: Record the Delivery ---
    const delivery = new Delivery({
      supplier,
      productsReceived,
      recordedBy,
    });

    const createdDelivery = await delivery.save();
    res.status(201).json(createdDelivery);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all deliveries
// @route   GET /api/deliveries
const getDeliveries = async (req, res) => {
    try {
        const deliveries = await Delivery.find({})
            .sort({ createdAt: -1 })
            .populate('supplier', 'name')
            .populate('recordedBy', 'fullName');
        res.json(deliveries);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
}


module.exports = { createDelivery, getDeliveries };