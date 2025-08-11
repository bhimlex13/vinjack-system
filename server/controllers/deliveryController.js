// server/controllers/deliveryController.js
const Delivery = require('../models/deliveryModel');
const Product = require('../models/productModel');
const logAction = require('../utils/logger'); 

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
      product.quantity += item.quantity;
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

    // --- Part 3: Log the Action ---
    // We need to populate the supplier name for a better log message
    await createdDelivery.populate('supplier', 'name');
    logAction(
      req.user, 
      'RECORD_DELIVERY', 
      `Recorded delivery of ${productsReceived.length} product type(s) from supplier '${createdDelivery.supplier.name}'.`
    );

    res.status(201).json(createdDelivery);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

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
