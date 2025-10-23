// server/controllers/deliveryController.js
const Delivery = require('../models/deliveryModel');
const Product = require('../models/productModel');
const logAction = require('../utils/logger');
const logMovement = require('../utils/movementLogger');
const { checkStockLevelAndNotify } = require('../utils/stockManager');
const mongoose = require('mongoose'); // Import mongoose for session

const createDelivery = async (req, res) => {
  const io = req.app.get('socketio');
  // --- MODIFIED: Destructure deliveryDate and optionally totalCost ---
  const { supplier, productsReceived, recordedBy, purchaseOrderId, deliveryDate, totalCost } = req.body;

  if (!productsReceived || productsReceived.length === 0) {
    return res.status(400).json({ message: 'Delivery must include at least one product.' });
  }

  // --- NEW: Basic validation for deliveryDate ---
  let finalDeliveryDate = deliveryDate ? new Date(deliveryDate) : new Date(); // Default to now
  if (isNaN(finalDeliveryDate.getTime())) {
      return res.status(400).json({ message: 'Invalid delivery date provided.' });
  }
  // --- END NEW ---

  // --- NEW: Calculate total cost if not provided ---
  let calculatedTotalCost = 0;
  if (typeof totalCost !== 'number' || totalCost < 0) {
    // Calculate from items if not provided or invalid
    calculatedTotalCost = productsReceived.reduce((sum, item) => {
        // Ensure quantity and costAtTime are numbers
        const qty = Number(item.quantity) || 0;
        const cost = Number(item.costAtTime) || 0;
        return sum + (qty * cost);
    }, 0);
  } else {
    calculatedTotalCost = totalCost; // Use provided totalCost
  }
  // --- END NEW ---

  const session = await mongoose.startSession(); // Start session
  try {
    session.startTransaction(); // Start transaction

    const movementsToLog = [];

    for (const item of productsReceived) {
      // Validate quantity and cost
      const quantity = Number(item.quantity);
      const costAtTime = Number(item.costAtTime);
      if (isNaN(quantity) || quantity <= 0) {
         throw new Error(`Invalid quantity provided for product ID ${item.product}.`);
      }
      if (isNaN(costAtTime) || costAtTime < 0) {
         throw new Error(`Invalid cost provided for product ID ${item.product}.`);
      }


      const product = await Product.findById(item.product).session(session); // Use session
      if (!product) {
        throw new Error(`Product with ID ${item.product} not found.`);
      }

      const stockBefore = product.quantity;
      product.quantity = Number(product.quantity) + quantity; // Use validated quantity

      // Update product cost only if costAtTime is provided (it's required in schema now)
      product.cost = costAtTime; // Use validated cost

      movementsToLog.push({
        product: product._id,
        type: 'DELIVERY',
        quantityChange: quantity, // Use validated quantity
        stockBefore,
        recordedBy: req.user.id // Assumes req.user is populated by auth middleware
      });

      await product.save({ session }); // Use session

      // checkStockLevelAndNotify might need session awareness or run after commit
      // For now, assume it runs okay without session or after commit
      // await checkStockLevelAndNotify(product, io); // Consider moving after commit
    }

    const delivery = new Delivery({
      supplier,
      productsReceived,
      deliveryDate: finalDeliveryDate, // Save the date
      totalCost: calculatedTotalCost, // Save the total cost
      recordedBy: req.user.id,
      purchaseOrder: purchaseOrderId || undefined
    });
    const createdDelivery = await delivery.save({ session }); // Use session

    // Log movements after delivery is saved to get referenceId
    for (const movement of movementsToLog) {
        movement.referenceId = createdDelivery._id;
        // Assuming logMovement can handle sessions or is safe to run within tx
        await logMovement(movement, { session });
    }

    // Populate supplier for logging message *before* commit (might require adjustment if supplier creation is part of tx)
    // Safest might be to fetch supplier name separately or log after commit
    let supplierName = 'N/A';
    if(createdDelivery.supplier) {
        const sup = await mongoose.model('Supplier').findById(createdDelivery.supplier).select('name').lean().session(session);
        if(sup) supplierName = sup.name;
    }

    // Log action before commit
    logAction(
      req.user,
      'RECORD_DELIVERY',
      `Recorded delivery #${createdDelivery._id} from supplier '${supplierName}'.`,
      { entityType: 'Delivery', entityId: createdDelivery._id } // Added entity info
    );

    await session.commitTransaction(); // Commit transaction

    // Perform non-transactional operations like notifications after commit
    for (const item of productsReceived) {
        const product = await Product.findById(item.product);
        if(product) await checkStockLevelAndNotify(product, io);
    }


    // Populate fully after commit for the response
    const populatedDelivery = await Delivery.findById(createdDelivery._id)
                                        .populate('supplier', 'name')
                                        .populate('recordedBy', 'fullName')
                                        .populate('productsReceived.product', 'name')
                                        .populate('purchaseOrder', 'poNumber');


    res.status(201).json(populatedDelivery);

  } catch (error) {
    await session.abortTransaction(); // Abort on error
    console.error("Error creating delivery:", error); // Log detailed error
    res.status(400).json({ message: error.message || "Failed to record delivery." }); // Send specific error
  } finally {
    session.endSession(); // End session
  }
};

const getDeliveries = async (req, res) => {
    try {
        const deliveries = await Delivery.find({})
            .sort({ deliveryDate: -1 }) // Now sort by the correct field
            .populate('supplier', 'name')
            .populate('recordedBy', 'fullName')
            .populate({
                path: 'productsReceived.product',
                select: 'name'
            })
            .populate('purchaseOrder', 'poNumber');

        res.json(deliveries);
    } catch (error) {
        console.error("Error fetching deliveries:", error);
        res.status(500).json({ message: 'Server Error fetching deliveries' });
    }
}

module.exports = { createDelivery, getDeliveries };