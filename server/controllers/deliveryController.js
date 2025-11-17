// server/controllers/deliveryController.js
const Delivery = require('../models/deliveryModel');
const Product = require('../models/productModel');
const logAction = require('../utils/logger');
const logMovement = require('../utils/movementLogger');
const { checkStockLevelAndNotify } = require('../utils/stockManager');
const mongoose = require('mongoose');

const createDelivery = async (req, res) => {
  const io = req.app.get('socketio');
  // --- UPDATED: Destructure deliveryType ---
  const { supplier, productsReceived, recordedBy, purchaseOrderId, deliveryDate, totalCost, deliveryType } = req.body;
  // --- END UPDATED ---

  if (!productsReceived || productsReceived.length === 0) {
    return res.status(400).json({ message: 'Delivery must include at least one product.' });
  }

  let finalDeliveryDate = deliveryDate ? new Date(deliveryDate) : new Date();
  if (isNaN(finalDeliveryDate.getTime())) {
      return res.status(400).json({ message: 'Invalid delivery date provided.' });
  }

  let calculatedTotalCost = 0;
  if (typeof totalCost !== 'number' || totalCost < 0) {
    calculatedTotalCost = productsReceived.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const cost = Number(item.costAtTime) || 0;
        return sum + (qty * cost);
    }, 0);
  } else {
    calculatedTotalCost = totalCost;
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const movementsToLog = [];

    for (const item of productsReceived) {
      const quantity = Number(item.quantity);
      const costAtTime = Number(item.costAtTime);
      if (isNaN(quantity) || quantity <= 0) {
         throw new Error(`Invalid quantity provided for product ID ${item.product}.`);
      }
      if (isNaN(costAtTime) || costAtTime < 0) {
         throw new Error(`Invalid cost provided for product ID ${item.product}.`);
      }

      const product = await Product.findById(item.product).session(session);
      if (!product) {
        throw new Error(`Product with ID ${item.product} not found.`);
      }

      const stockBefore = product.quantity;
      product.quantity = Number(product.quantity) + quantity;

      // --- NEW: Check deliveryType and update consignedStock if needed ---
      if (deliveryType === 'Consignment') {
        product.consignedStock = (Number(product.consignedStock) || 0) + quantity;
      }
      // --- END NEW ---

      // --- UPDATED: This field is 'defaultCost' on the product model, not 'cost' ---
      product.defaultCost = costAtTime; // Update the product's default cost
      // --- END UPDATED ---

      movementsToLog.push({
        product: product._id,
        // --- NEW: Log movement type based on deliveryType ---
        type: deliveryType === 'Consignment' ? 'DELIVERY (CONSIGN)' : 'DELIVERY',
        // --- END NEW ---
        quantityChange: quantity,
        stockBefore,
        recordedBy: req.user.id
      });

      await product.save({ session });
    }

    const delivery = new Delivery({
      supplier,
      productsReceived,
      deliveryDate: finalDeliveryDate,
      totalCost: calculatedTotalCost,
      // --- NEW: Save the deliveryType ---
      deliveryType: deliveryType || 'Purchase',
      // --- END NEW ---
      recordedBy: req.user.id,
      purchaseOrder: purchaseOrderId || undefined
    });
    const createdDelivery = await delivery.save({ session });

    for (const movement of movementsToLog) {
        movement.referenceId = createdDelivery._id;
        await logMovement(movement, { session });
    }

    let supplierName = 'N/A';
    if(createdDelivery.supplier) {
        const sup = await mongoose.model('Supplier').findById(createdDelivery.supplier).select('name').lean().session(session);
        if(sup) supplierName = sup.name;
    }

    logAction(
      req.user,
      'RECORD_DELIVERY',
      `Recorded delivery #${createdDelivery._id} from supplier '${supplierName}'.`,
      { entityType: 'Delivery', entityId: createdDelivery._id }
    );

    await session.commitTransaction();

    for (const item of productsReceived) {
        const product = await Product.findById(item.product);
        if(product) await checkStockLevelAndNotify(product, io);
    }

    const populatedDelivery = await Delivery.findById(createdDelivery._id)
                                        .populate('supplier', 'name')
                                        .populate('recordedBy', 'fullName')
                                        .populate('productsReceived.product', 'name')
                                        .populate('purchaseOrder', 'poNumber');

    res.status(201).json(populatedDelivery);

  } catch (error) {
    await session.abortTransaction();
    console.error("Error creating delivery:", error);
    res.status(400).json({ message: error.message || "Failed to record delivery." });
  } finally {
    session.endSession();
  }
};

const getDeliveries = async (req, res) => {
    try {
        const deliveries = await Delivery.find({})
            .sort({ deliveryDate: -1 })
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