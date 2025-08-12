// server/controllers/saleController.js
const Sale = require('../models/saleModel');
const Product = require('../models/productModel');
const logAction = require('../utils/logger');
const logMovement = require('../utils/movementLogger'); // <-- ADDED

const createSale = async (req, res) => {
  const { items, services, totalAmount } = req.body;

  if ((!items || items.length === 0) && (!services || services.length === 0)) {
    return res.status(400).json({ message: 'Sale must include at least one item or service.' });
  }

  try {
    const processedItems = [];
    const movementsToLog = []; // Array to hold movements until sale is saved

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`Product with ID ${item.product} not found.`);
      }
      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Only ${product.quantity} left.`);
      }
      
      const stockBefore = product.quantity;
      product.quantity -= item.quantity;
      
      // Prepare the movement log without the referenceId for now
      movementsToLog.push({
          product: product._id,
          type: 'SALE',
          quantityChange: -item.quantity,
          stockBefore,
          recordedBy: req.user.id
      });
      
      await product.save();
      
      processedItems.push({
        product: item.product,
        quantity: item.quantity,
        priceAtTime: item.priceAtTime,
        costAtTime: product.cost
      });
    }

    const sale = new Sale({
      items: processedItems,
      services,
      totalAmount,
      recordedBy: req.user.id,
    });
    const createdSale = await sale.save();
    
    // Now that the sale is saved, log all movements with the new Sale ID
    for (const movement of movementsToLog) {
        movement.referenceId = createdSale._id;
        await logMovement(movement);
    }

    logAction(
      req.user, 
      'PROCESS_SALE', 
      `Processed sale #${createdSale._id} with ${items.length} item type(s) for a total of ₱${totalAmount.toFixed(2)}.`
    );

    const populatedSale = await Sale.findById(createdSale._id)
      .populate('recordedBy', 'fullName')
      .populate('items.product', 'name');

    res.status(201).json(populatedSale);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAllSales = async (req, res) => {
    try {
        const sales = await Sale.find({})
            .sort({ createdAt: -1 })
            .populate('recordedBy', 'fullName')
            .populate('items.product', 'name');
        
        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching sales.', error: error.message });
    }
};

module.exports = { createSale, getAllSales };