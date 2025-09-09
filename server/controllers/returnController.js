// server/controllers/returnController.js
const Return = require('../models/returnModel');
const Sale = require('../models/saleModel');
const Product = require('../models/productModel');
const logAction = require('../utils/logger');
const logMovement = require('../utils/movementLogger');
const mongoose = require('mongoose');

// @desc    Create a new sales return
// @route   POST /api/returns
const createReturn = async (req, res) => {
  const { originalSaleId, itemsReturned, servicesReturned, reason } = req.body;

  if (!originalSaleId || !reason) {
    return res.status(400).json({ message: 'Original Sale ID and a reason are required.' });
  }
  if ((!itemsReturned || itemsReturned.length === 0) && (!servicesReturned || servicesReturned.length === 0)) {
    return res.status(400).json({ message: 'Return must include at least one item or service.' });
  }
  
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const originalSale = await Sale.findById(originalSaleId).session(session);
    if (!originalSale) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Original sale record not found.' });
    }

    let calculatedRefundAmount = 0;
    const processedItems = [];
    const processedServices = [];
    const movementsToLog = [];

    // Process returned items
    if (itemsReturned && itemsReturned.length > 0) {
      for (const returnedItem of itemsReturned) {
        const soldItem = originalSale.items.find(item => item.product.toString() === returnedItem.product);
        if (!soldItem) {
          throw new Error(`Product ID ${returnedItem.product} was not found in the original sale.`);
        }
        if (returnedItem.quantity > soldItem.quantity) {
          throw new Error(`Cannot return more items than were originally sold.`);
        }

        const product = await Product.findById(returnedItem.product).session(session);
        const stockBefore = product.quantity;
        product.quantity += returnedItem.quantity; // Add stock back
        await product.save({ session });

        calculatedRefundAmount += returnedItem.quantity * soldItem.priceAtTime;
        processedItems.push({
          product: returnedItem.product,
          quantity: returnedItem.quantity,
          priceAtTime: soldItem.priceAtTime
        });
        
        movementsToLog.push({
          product: product._id,
          type: 'SALE_RETURN',
          quantityChange: returnedItem.quantity, // Positive change
          stockBefore,
          recordedBy: req.user.id
        });
      }
    }

    // Process returned services
    if (servicesReturned && servicesReturned.length > 0) {
      for (const returnedService of servicesReturned) {
        const soldService = originalSale.services.find(s => s.service.toString() === returnedService.service);
         if (!soldService) {
          throw new Error(`Service ID ${returnedService.service} was not found in the original sale.`);
        }
        calculatedRefundAmount += soldService.priceAtTime;
        processedServices.push({
          service: returnedService.service,
          priceAtTime: soldService.priceAtTime
        });
      }
    }

    const newReturn = new Return({
      originalSale: originalSaleId,
      itemsReturned: processedItems,
      servicesReturned: processedServices,
      reason,
      totalRefundAmount: calculatedRefundAmount,
      recordedBy: req.user.id,
    });
    
    const savedReturn = await newReturn.save({ session });
    
    for (const movement of movementsToLog) {
        movement.referenceId = savedReturn._id;
        await logMovement(movement, { session });
    }

    logAction(req.user, 'PROCESS_RETURN', `Processed return for Sale #${originalSale._id} totaling ₱${calculatedRefundAmount.toFixed(2)}.`);
    
    await session.commitTransaction();
    
    const populatedReturn = await Return.findById(savedReturn._id)
        .populate('recordedBy', 'fullName')
        .populate('itemsReturned.product', 'name')
        .populate('servicesReturned.service', 'name');

    res.status(201).json(populatedReturn);

  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Get all returns
// @route   GET /api/returns
const getAllReturns = async (req, res) => {
    try {
        const returns = await Return.find({})
            .sort({ createdAt: -1 })
            .populate('originalSale', '_id createdAt totalAmount')
            .populate('recordedBy', 'fullName')
            .populate('itemsReturned.product', 'name itemCode')
            .populate('servicesReturned.service', 'name');
            
        res.json(returns);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching returns.', error: error.message });
    }
};

module.exports = { createReturn, getAllReturns };