// server/controllers/returnController.js
const Return = require('../models/returnModel');
const Sale = require('../models/saleModel');
const Product = require('../models/productModel');
const logAction = require('../utils/logger');
const logMovement = require('../utils/movementLogger');
const mongoose = require('mongoose');

// --- NEW FUNCTION to get returns by original sale ID ---
const getReturnsBySale = async (req, res) => {
  try {
    const { saleId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(saleId)) {
      return res.status(400).json({ message: 'Invalid Sale ID format.' });
    }

    const returns = await Return.find({ originalSale: saleId })
      .select('itemsReturned') // Only need itemsReturned for calculation
      .lean(); // Use lean for performance as we only read data

    res.json(returns || []); // Return empty array if null/undefined

  } catch (error) {
    console.error("Error fetching returns by sale:", error); // Log the error
    res.status(500).json({ message: 'Server error fetching return history for this sale.', error: error.message });
  }
};
// --- END NEW FUNCTION ---

const createReturn = async (req, res) => {
  // --- MODIFIED: Destructure totalRefundAmount from frontend ---
  const { originalSaleId, itemsReturned, servicesReturned, reason, outcome, totalRefundAmount } = req.body; // Added totalRefundAmount

  if (!originalSaleId || !reason) {
    return res.status(400).json({ message: 'Original Sale ID and a reason are required.' });
  }
  if ((!itemsReturned || itemsReturned.length === 0) && (!servicesReturned || servicesReturned.length === 0)) {
    return res.status(400).json({ message: 'Return must include at least one item or service.' });
  }
  if (!outcome || !['Restocked', 'Refunded', 'Replaced', 'Discarded'].includes(outcome)) {
    return res.status(400).json({ message: 'A valid return outcome (Restocked, Refunded, Replaced, Discarded) is required.' });
  }
  // --- NEW: Validate totalRefundAmount ---
  if (typeof totalRefundAmount !== 'number' || totalRefundAmount < 0) {
     return res.status(400).json({ message: 'Invalid total refund amount provided.' });
  }
  // --- END NEW ---

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const originalSale = await Sale.findById(originalSaleId).lean().session(session); // Use lean here too
    if (!originalSale) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Original sale record not found.' });
    }

    // --- NEW: Backend Validation - Fetch previous returns and calculate limits ---
    const previousReturns = await Return.find({ originalSale: originalSaleId }).lean().session(session);
    const alreadyReturnedQuantities = {};
    previousReturns.forEach(ret => {
      ret.itemsReturned.forEach(item => {
        const productIdStr = item.product.toString();
        alreadyReturnedQuantities[productIdStr] = (alreadyReturnedQuantities[productIdStr] || 0) + item.quantity;
      });
    });
    // --- END NEW ---

    // let calculatedRefundAmount = 0; // Removed calculation, using value from frontend
    const processedItems = [];
    const processedServices = [];
    const movementsToLog = [];

    if (itemsReturned && itemsReturned.length > 0) {
      for (const returnedItem of itemsReturned) {
        const productIdStr = returnedItem.product.toString(); // Ensure consistent string comparison
        const soldItem = originalSale.items.find(item => item.product.toString() === productIdStr);

        if (!soldItem) {
          throw new Error(`Product ID ${returnedItem.product} was not found in the original sale.`);
        }

        // --- NEW: Backend Validation - Check against max returnable ---
        const alreadyReturnedQty = alreadyReturnedQuantities[productIdStr] || 0;
        const maxReturnable = soldItem.quantity - alreadyReturnedQty;

        if (returnedItem.quantity <= 0) {
            throw new Error(`Return quantity for product ${soldItem.product.toString()} must be positive.`); // Check for non-positive return qty
        }
        if (returnedItem.quantity > maxReturnable) {
          throw new Error(`Cannot return ${returnedItem.quantity} units of product ${soldItem.product.toString()}. Only ${maxReturnable} more units can be returned for this sale.`);
        }
        // --- END NEW ---

        // Only restock if outcome is 'Restocked'
        if (outcome === 'Restocked') {
            const product = await Product.findById(returnedItem.product).session(session);
            if (!product) {
                throw new Error(`Product ID ${returnedItem.product} not found in inventory.`);
            }
            const stockBefore = product.quantity;
            // --- FIX: Ensure quantity is treated as number ---
            product.quantity = Number(product.quantity) + Number(returnedItem.quantity);
            await product.save({ session });

            movementsToLog.push({
              product: product._id,
              type: 'RETURN',
              quantityChange: Number(returnedItem.quantity),
              stockBefore,
              recordedBy: req.user.id
            });
        }

        // calculatedRefundAmount += returnedItem.quantity * soldItem.priceAtTime; // Removed calculation
        processedItems.push({
          product: returnedItem.product,
          quantity: returnedItem.quantity,
          priceAtTime: soldItem.priceAtTime // Store priceAtTime from original sale
        });
      }
    }

    // Service return logic (remains the same, but doesn't add to calculatedRefundAmount here)
    if (servicesReturned && servicesReturned.length > 0) {
      for (const returnedService of servicesReturned) {
        const soldService = originalSale.services.find(s => s.service.toString() === returnedService.service);
         if (!soldService) {
          throw new Error(`Service ID ${returnedService.service} not found in the original sale.`);
        }
        // calculatedRefundAmount += soldService.priceAtTime; // Removed calculation
        processedServices.push({
          service: returnedService.service,
          priceAtTime: soldService.priceAtTime // Store priceAtTime from original sale
        });
      }
    }

    const newReturn = new Return({
      originalSale: originalSaleId,
      itemsReturned: processedItems,
      servicesReturned: processedServices,
      reason,
      outcome: outcome,
      totalRefundAmount: totalRefundAmount, // Use amount from frontend
      recordedBy: req.user.id,
    });

    const savedReturn = await newReturn.save({ session });

    if (movementsToLog.length > 0) {
        for (const movement of movementsToLog) {
            movement.referenceId = savedReturn._id;
            // --- PASS SESSION to logMovement if it supports it ---
            // If logMovement isn't session-aware, this might cause issues on abort.
            // Assuming logMovement *is* session aware or can be made so:
            await logMovement(movement, { session: session });
        }
    }

    logAction(req.user, 'PROCESS_RETURN', `Processed return for Sale #${originalSale._id} totaling ₱${totalRefundAmount.toFixed(2)}. Outcome: ${outcome}.`, { entityType: 'Return', entityId: savedReturn._id });

    await session.commitTransaction();

    // Populate after commit
    const populatedReturn = await Return.findById(savedReturn._id)
        .populate('recordedBy', 'fullName')
        .populate('itemsReturned.product', 'name')
        .populate('servicesReturned.service', 'name')
        .populate('originalSale', '_id createdAt totalAmount');

    res.status(201).json(populatedReturn);

  } catch (error) {
    await session.abortTransaction();
    console.error("Error processing return:", error); // Log the detailed error
    res.status(400).json({ message: error.message || 'Failed to process return.' }); // Send specific error message back
  } finally {
    session.endSession();
  }
};

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

const getReturnById = async (req, res) => {
  try {
    const returnRecord = await Return.findById(req.params.id)
      .populate('recordedBy', 'fullName')
      .populate('itemsReturned.product', 'name itemCode')
      .populate('servicesReturned.service', 'name')
      .populate({
        path: 'originalSale',
        select: '_id createdAt totalAmount customer items.product items.quantity', // Include items for context if needed
        populate: [ // Populate multiple paths if needed
           { path: 'customer', select: 'name' }, // Changed from fullName
           { path: 'items.product', select: 'name' } // Populate product name within original sale items
        ]
      });

    if (!returnRecord) {
      return res.status(404).json({ message: 'Return record not found.' });
    }

    res.json(returnRecord);

  } catch (error) {
    res.status(500).json({ message: 'Server error fetching return details.', error: error.message });
  }
};


module.exports = {
  createReturn,
  getAllReturns,
  getReturnById,
  getReturnsBySale // --- EXPORT the new function ---
};