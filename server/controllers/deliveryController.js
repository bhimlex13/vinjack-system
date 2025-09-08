// server/controllers/deliveryController.js
const Delivery = require('../models/deliveryModel');
const Product = require('../models/productModel');
const logAction = require('../utils/logger'); 
const logMovement = require('../utils/movementLogger');
const { createNotification } = require('../utils/notificationManager');

const createDelivery = async (req, res) => {
  const { supplier, productsReceived, recordedBy } = req.body;

  if (!productsReceived || productsReceived.length === 0) {
    return res.status(400).json({ message: 'Delivery must include at least one product.' });
  }

  try {
    const movementsToLog = [];

    for (const item of productsReceived) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`Product with ID ${item.product} not found.`);
      }

      const stockBefore = product.quantity;
      product.quantity += item.quantity;
      if (item.costAtTime) { 
        product.cost = item.costAtTime;
      }
      
      movementsToLog.push({
        product: product._id,
        type: 'DELIVERY',
        quantityChange: item.quantity,
        stockBefore,
        recordedBy: req.user.id
      });

      await product.save();

      if (product.quantity <= product.reorderLevel && stockBefore > product.reorderLevel) {
        await createNotification({
            recipientRole: 'Owner',
            message: `${product.name} is now low on stock (${product.quantity} remaining).`,
            type: 'LOW_STOCK',
            link: '/inventory'
        });
      }
    }

    const delivery = new Delivery({
      supplier,
      productsReceived,
      recordedBy: req.user.id,
    });
    const createdDelivery = await delivery.save();

    for (const movement of movementsToLog) {
        movement.referenceId = createdDelivery._id;
        await logMovement(movement);
    }

    await createdDelivery.populate('supplier', 'name');
    logAction(
      req.user, 
      'RECORD_DELIVERY', 
      `Recorded delivery #${createdDelivery._id} from supplier '${createdDelivery.supplier.name}'.`
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
            .populate('recordedBy', 'fullName')
            // --- FIX: Populate the nested product details ---
            .populate({
                path: 'productsReceived.product',
                select: 'name' // We only need the product name
            })
            // --- FIX: Populate the purchase order details ---
            .populate('purchaseOrder', 'poNumber'); // We only need the PO number

        res.json(deliveries); // Changed to res.json({ data: deliveries }) for consistency
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
}

module.exports = { createDelivery, getDeliveries };