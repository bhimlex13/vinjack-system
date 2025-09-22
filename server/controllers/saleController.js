// server/controllers/saleController.js
const Sale = require('../models/saleModel');
const Product = require('../models/productModel');
const Service = require('../models/serviceModel');
const Customer = require('../models/customerModel');
const logAction = require('../utils/logger');
const logMovement = require('../utils/movementLogger');
const { createNotification } = require('../utils/notificationManager');

const createSale = async (req, res) => {
  const io = req.app.get('socketio');
  const { items, services, customerId, motorcycleId } = req.body;

  if ((!items || items.length === 0) && (!services || services.length === 0)) {
    return res.status(400).json({ message: 'Sale must include at least one item or service.' });
  }

  try {
    if (customerId) {
        const customerExists = await Customer.findById(customerId);
        if (!customerExists) {
            return res.status(404).json({ message: 'Customer not found.' });
        }
    }

    let calculatedTotal = 0;
    const processedItems = [];
    const processedServices = [];
    const movementsToLog = [];

    if (items && items.length > 0) {
        for (const item of items) {
          const product = await Product.findById(item.product);
          if (!product) throw new Error(`Product with ID ${item.product} not found.`);
          if (product.quantity < item.quantity) throw new Error(`Insufficient stock for ${product.name}. Only ${product.quantity} left.`);
          
          const stockBefore = product.quantity;
          product.quantity -= item.quantity;
          
          movementsToLog.push({
              product: product._id, type: 'SALE', quantityChange: -item.quantity,
              stockBefore, recordedBy: req.user.id
          });
          
          await product.save();
          calculatedTotal += item.quantity * product.price;
          
          const warningPayload = {
            productName: product.name,
            remainingQuantity: product.quantity,
            image: product.image,
          };

          if (product.quantity === 0 && stockBefore > 0) {
            const newNotifications = await createNotification({
                recipientRole: 'Owner', message: `${product.name} is now OUT OF STOCK.`,
                type: 'OUT_OF_STOCK', link: '/inventory'
            });
            if (newNotifications && newNotifications.length) {
                newNotifications.forEach(notification => io.to(notification.user.toString()).emit('new_notification', notification));
            }
            io.emit('stock_level_warning', { ...warningPayload, type: 'OUT_OF_STOCK', message: `${product.name} is now OUT OF STOCK.` });
          } 
          else if (product.quantity <= product.reorderLevel && stockBefore > product.reorderLevel) {
            const newNotifications = await createNotification({
                recipientRole: 'Owner', message: `${product.name} is low on stock (${product.quantity} remaining).`,
                type: 'LOW_STOCK', link: '/inventory'
            });
            if (newNotifications && newNotifications.length) {
                newNotifications.forEach(notification => io.to(notification.user.toString()).emit('new_notification', notification));
            }
            io.emit('stock_level_warning', { ...warningPayload, type: 'LOW_STOCK', message: `${product.name} is low on stock (${product.quantity} remaining).` });
          }
          
          processedItems.push({
            product: item.product, quantity: item.quantity,
            priceAtTime: product.price, costAtTime: product.cost
          });
        }
    }

    if (services && services.length > 0) {
      for (const serviceItem of services) {
        const service = await Service.findById(serviceItem.service);
        if (!service || service.status !== 'active') throw new Error(`Service with ID ${serviceItem.service} not found or is inactive.`);
        calculatedTotal += service.charge;
        processedServices.push({ service: service._id, priceAtTime: service.charge });
      }
    }

    const sale = new Sale({
      items: processedItems, services: processedServices, totalAmount: calculatedTotal,
      recordedBy: req.user.id, customer: customerId || undefined,
      motorcycle: motorcycleId || undefined,
    });
    const createdSale = await sale.save();
    
    for (const movement of movementsToLog) {
        movement.referenceId = createdSale._id;
        await logMovement(movement);
    }

    // --- MODIFIED LINE ---
    logAction(req.user, 'PROCESS_SALE', `Processed sale #${createdSale._id} with a total of ₱${calculatedTotal.toFixed(2)}.`, { entityType: 'Sale', entityId: createdSale._id });

    const populatedSale = await Sale.findById(createdSale._id)
      .populate('recordedBy', 'fullName')
      .populate('items.product', 'name')
      .populate('services.service', 'name')
      .populate('customer', 'name')
      .populate('motorcycle', 'make model plateNumber');

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
            .populate('services.service', 'name')
            .populate('customer', 'name')
            .populate('motorcycle', 'make model plateNumber');
        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching sales.', error: error.message });
    }
};

const getSaleById = async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id)
            .populate('recordedBy', 'fullName')
            .populate('items.product', 'name')
            .populate('services.service', 'name')
            .populate('customer', 'name')
            .populate('motorcycle', 'make model plateNumber');
        
        if (!sale) return res.status(404).json({ message: 'Sale not found.' });
        res.json(sale);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching sale details.', error: error.message });
    }
};

const searchSales = async (req, res) => {
  try {
    const { customerId, userId, startDate, endDate } = req.query;
    
    let filter = {};

    if (customerId) filter.customer = customerId;
    if (userId) filter.recordedBy = userId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endOfDay;
      }
    }

    const sales = await Sale.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('customer', 'name');

    res.json(sales);

  } catch (error) {
    res.status(500).json({ message: 'Server error while searching sales.', error: error.message });
  }
};

module.exports = { createSale, getAllSales, getSaleById, searchSales };