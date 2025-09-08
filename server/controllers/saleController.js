// server/controllers/saleController.js
const Sale = require('../models/saleModel');
const Product = require('../models/productModel');
const Service = require('../models/serviceModel'); // <-- ADD THIS LINE
const logAction = require('../utils/logger');
const logMovement = require('../utils/movementLogger');
const { createNotification } = require('../utils/notificationManager');

const createSale = async (req, res) => {
  const io = req.app.get('socketio');
  // We no longer trust totalAmount from the client. We will calculate it.
  const { items, services } = req.body;

  if ((!items || items.length === 0) && (!services || services.length === 0)) {
    return res.status(400).json({ message: 'Sale must include at least one item or service.' });
  }

  try {
    let calculatedTotal = 0; // This will be our trusted total
    const processedItems = [];
    const processedServices = []; // For storing services with trusted prices
    const movementsToLog = [];

    // --- Process Items and Calculate their Subtotal ---
    // Use a for...of loop to handle async operations correctly
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

      // Accumulate the total based on the DATABASE price, not the client price
      calculatedTotal += item.quantity * product.price;
      
      const warningPayload = {
        productName: product.name,
        remainingQuantity: product.quantity,
        image: product.image,
      };

      if (product.quantity === 0 && stockBefore > 0) {
        const newNotifications = await createNotification({
            recipientRole: 'Owner',
            message: `${product.name} is now OUT OF STOCK.`,
            type: 'OUT_OF_STOCK',
            link: '/inventory'
        });
        if (newNotifications && newNotifications.length) {
            newNotifications.forEach(notification => io.to(notification.user.toString()).emit('new_notification', notification));
        }
        io.emit('stock_level_warning', { ...warningPayload, type: 'OUT_OF_STOCK', message: `${product.name} is now OUT OF STOCK.` });
      } 
      else if (product.quantity <= product.reorderLevel && stockBefore > product.reorderLevel) {
        const newNotifications = await createNotification({
            recipientRole: 'Owner',
            message: `${product.name} is low on stock (${product.quantity} remaining).`,
            type: 'LOW_STOCK',
            link: '/inventory'
        });
        if (newNotifications && newNotifications.length) {
            newNotifications.forEach(notification => io.to(notification.user.toString()).emit('new_notification', notification));
        }
        io.emit('stock_level_warning', { ...warningPayload, type: 'LOW_STOCK', message: `${product.name} is low on stock (${product.quantity} remaining).` });
      }
      
      processedItems.push({
        product: item.product,
        quantity: item.quantity,
        priceAtTime: product.price, // Use trusted price
        costAtTime: product.cost
      });
    }

    // --- Process Services and Calculate their Subtotal ---
    if (services && services.length > 0) {
      for (const serviceItem of services) {
        const service = await Service.findById(serviceItem.service);
        if (!service || service.status !== 'active') {
          throw new Error(`Service with ID ${serviceItem.service} not found or is inactive.`);
        }
        // Add the service's charge from the DATABASE to our total
        calculatedTotal += service.charge;
        processedServices.push({
          service: service._id,
          priceAtTime: service.charge // Use trusted charge
        });
      }
    }

    // --- Finalize and Save the Sale ---
    const sale = new Sale({
      items: processedItems,
      services: processedServices,
      totalAmount: calculatedTotal, // Use our securely calculated total
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
      `Processed sale #${createdSale._id} with a total of ₱${calculatedTotal.toFixed(2)}.`
    );

    const populatedSale = await Sale.findById(createdSale._id)
      .populate('recordedBy', 'fullName')
      .populate('items.product', 'name')
      .populate('services.service', 'name'); // Populate service name

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
            .populate('items.product', 'name')
            .populate('services.service', 'name'); // Populate service name here too
        
        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching sales.', error: error.message });
    }
};

module.exports = { createSale, getAllSales };