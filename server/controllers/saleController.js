// server/controllers/saleController.js
const Sale = require('../models/saleModel');
const Product = require('../models/productModel');
const Service = require('../models/serviceModel');
const Customer = require('../models/customerModel');
const logAction = require('../utils/logger');
const logMovement = require('../utils/movementLogger');
const { checkStockLevelAndNotify } = require('../utils/stockManager');
// const path = require('path'); // No longer needed for this controller

// --- createSale, getAllSales, getSaleById, searchSales remain unchanged ---
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
    const productsToUpdate = [];

    if (items && items.length > 0) {
        for (const item of items) {
          const product = await Product.findById(item.product).select('name quantity price defaultCost maxStock stockStatus');
          if (!product) throw new Error(`Product with ID ${item.product} not found.`);
          if (product.quantity < item.quantity) throw new Error(`Insufficient stock for ${product.name}. Only ${product.quantity} left.`);

          const stockBefore = product.quantity;
          product.quantity -= item.quantity;
          productsToUpdate.push(product);

          movementsToLog.push({
              product: product._id, type: 'SALE', quantityChange: -item.quantity,
              stockBefore, recordedBy: req.user.id
          });

          const salePrice = product.price;
          calculatedTotal += item.quantity * salePrice;

          processedItems.push({
            product: item.product,
            quantity: item.quantity,
            priceAtTime: salePrice,
            costOfGoodsSold: product.defaultCost || 0
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

    for (const prod of productsToUpdate) {
        await prod.save();
        await checkStockLevelAndNotify(prod, io);
    }

    const sale = new Sale({
      items: processedItems,
      services: processedServices,
      totalAmount: calculatedTotal,
      recordedBy: req.user.id,
      customer: customerId || undefined,
      motorcycle: motorcycleId || undefined,
    });
    const createdSale = await sale.save();

    for (const movement of movementsToLog) {
        movement.referenceId = createdSale._id;
        await logMovement(movement);
    }

    logAction(req.user, 'PROCESS_SALE', `Processed sale #${createdSale._id} with a total of ₱${calculatedTotal.toFixed(2)}.`, { entityType: 'Sale', entityId: createdSale._id });

    const populatedSale = await Sale.findById(createdSale._id)
      .populate('recordedBy', 'fullName')
      .populate('items.product', 'name')
      .populate({ path: 'services.service', select: 'name' })
      .populate('customer', 'name')
      .populate('motorcycle', 'make model plateNumber');

    res.status(201).json(populatedSale);

  } catch (error) {
    console.error("Error creating sale:", error);
    res.status(400).json({ message: error.message || "An unexpected error occurred while processing the sale." });
  }
};
const getAllSales = async (req, res) => {
    try {
        const sales = await Sale.find({})
            .sort({ createdAt: -1 })
            .populate('recordedBy', 'fullName')
            .populate('items.product', 'name')
            .populate({ path: 'services.service', select: 'name' })
            .populate('customer', 'name')
            .populate('motorcycle', 'make model plateNumber');
        res.json(sales);
    } catch (error) {
        console.error("Error fetching all sales:", error);
        res.status(500).json({ message: 'Server error fetching sales.', error: error.message });
    }
 };
const getSaleById = async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id)
            .populate('recordedBy', 'fullName')
            .populate('items.product', 'name')
            .populate({ path: 'services.service', select: 'name' })
            .populate('customer', 'name')
            .populate('motorcycle', 'make model plateNumber');

        if (!sale) return res.status(404).json({ message: 'Sale not found.' });
        res.json(sale);
    } catch (error) {
        console.error("Error fetching sale by ID:", error);
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
      if (startDate) { const startOfDay = new Date(startDate); startOfDay.setHours(0, 0, 0, 0); filter.createdAt.$gte = startOfDay; }
      if (endDate) { const endOfDay = new Date(endDate); endOfDay.setHours(23, 59, 59, 999); filter.createdAt.$lte = endOfDay; }
    }
    const sales = await Sale.find(filter).sort({ createdAt: -1 }).limit(100)
      .populate('customer', 'name').populate('recordedBy', 'fullName')
      .populate('items.product', 'name')
      .populate({ path: 'services.service', select: 'name' });
    res.json(sales);
  } catch (error) {
    console.error("Error searching sales:", error);
    res.status(500).json({ message: 'Server error while searching sales.', error: error.message });
  }
};

// --- NEW: Function to save Base64 receipt string ---
const saveReceiptString = async (req, res) => {
  try {
    const { receiptImageString } = req.body; // Get the string from the request body
    const saleId = req.params.id;

    if (!receiptImageString || !receiptImageString.startsWith('data:image')) {
      return res.status(400).json({ message: 'Invalid or missing image data provided.' });
    }

    // Find the sale and update the field directly
    const sale = await Sale.findByIdAndUpdate(
        saleId,
        { customerReceiptImage: receiptImageString }, // Save the full Base64 string
        { new: true, runValidators: true } // Return the updated document
    );

    if (!sale) {
      return res.status(404).json({ message: 'Sale not found.' });
    }

    logAction(
      req.user,
      'UPLOAD_SALE_RECEIPT', // Action type remains the same conceptually
      `Uploaded customer receipt image for Sale ID ${sale._id}. (Base64)`,
      { entityType: 'Sale', entityId: sale._id }
    );

    // Populate the updated sale to send back the full data needed by the frontend
    const populatedSale = await Sale.findById(sale._id)
      .populate('recordedBy', 'fullName').populate('items.product', 'name')
      .populate({ path: 'services.service', select: 'name' })
      .populate('customer', 'name').populate('motorcycle', 'make model plateNumber');

    res.status(200).json({
      message: 'Receipt image uploaded successfully.',
      sale: populatedSale // Send back the updated and populated sale object
    });

  } catch (error) {
    console.error('Error saving receipt string:', error);
    // Handle potential validation errors if the Base64 string is too long for MongoDB limits
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation Error: Image data might be too large.', details: error.message });
    }
    res.status(500).json({ message: 'Server error during receipt save.', error: error.message });
  }
};
// --- END NEW ---


module.exports = {
  createSale,
  getAllSales,
  getSaleById,
  searchSales,
  saveReceiptString // --- MODIFIED: Export the new function ---
};