// server/controllers/saleController.js
const Sale = require('../models/saleModel');
const Product = require('../models/productModel');
const logAction = require('../utils/logger');
const logMovement = require('../utils/movementLogger');
const { createNotification } = require('../utils/notificationManager');

const createSale = async (req, res) => {
  const io = req.app.get('socketio');
  const { items, services, totalAmount } = req.body;

  if ((!items || items.length === 0) && (!services || services.length === 0)) {
    return res.status(400).json({ message: 'Sale must include at least one item or service.' });
  }

  try {
    const processedItems = [];
    const movementsToLog = [];

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
      
      movementsToLog.push({
          product: product._id,
          type: 'SALE',
          quantityChange: -item.quantity,
          stockBefore,
          recordedBy: req.user.id
      });
      
      await product.save();
      
      const warningPayload = {
        productName: product.name,
        remainingQuantity: product.quantity,
        // --- ADDED: Include the product's image URL ---
        image: product.image,
      };

      if (product.quantity === 0 && stockBefore > 0) {
        // --- For Admins: Create a persistent notification ---
        const newNotifications = await createNotification({
            recipientRole: 'Owner',
            message: `${product.name} is now OUT OF STOCK.`,
            type: 'OUT_OF_STOCK',
            link: '/inventory'
        });

        if (newNotifications && newNotifications.length) {
            newNotifications.forEach(notification => {
                io.to(notification.user.toString()).emit('new_notification', notification);
            });
        }

        // --- For the User making the sale: Emit a real-time pop-up warning ---
        io.to(req.user.id).emit('stock_level_warning', {
          ...warningPayload,
          type: 'OUT_OF_STOCK',
          message: `${product.name} is now OUT OF STOCK.`
        });

      } 
      else if (product.quantity <= product.reorderLevel && stockBefore > product.reorderLevel) {
        // --- For Admins: Create a persistent notification ---
        const newNotifications = await createNotification({
            recipientRole: 'Owner',
            message: `${product.name} is low on stock (${product.quantity} remaining).`,
            type: 'LOW_STOCK',
            link: '/inventory'
        });
        
        if (newNotifications && newNotifications.length) {
            newNotifications.forEach(notification => {
                io.to(notification.user.toString()).emit('new_notification', notification);
            });
        }
        
        // --- For the User making the sale: Emit a real-time pop-up warning ---
        io.to(req.user.id).emit('stock_level_warning', {
          ...warningPayload,
          type: 'LOW_STOCK',
          message: `${product.name} is low on stock (${product.quantity} remaining).`
        });
      }
      
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