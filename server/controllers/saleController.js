// server/controllers/saleController.js
const Sale = require('../models/saleModel');
const Product = require('../models/productModel');
const Service = require('../models/serviceModel');
const Customer = require('../models/customerModel');
const logAction = require('../utils/logger');
const logMovement = require('../utils/movementLogger');
const { checkStockLevelAndNotify } = require('../utils/stockManager');
const path = require('path'); // Needed for path manipulation

const createSale = async (req, res) => {
  const io = req.app.get('socketio');
  const { items, services, customerId, motorcycleId } = req.body;

  if ((!items || items.length === 0) && (!services || services.length === 0)) {
    return res.status(400).json({ message: 'Sale must include at least one item or service.' });
  }

  // Use a session for transaction safety if needed, especially with stock updates
  // const session = await mongoose.startSession();
  // session.startTransaction();

  try {
    if (customerId) {
        const customerExists = await Customer.findById(customerId); //.session(session);
        if (!customerExists) {
            // await session.abortTransaction();
            // session.endSession();
            return res.status(404).json({ message: 'Customer not found.' });
        }
    }

    let calculatedTotal = 0;
    const processedItems = [];
    const processedServices = [];
    const movementsToLog = [];
    const productsToUpdate = []; // Keep track of products to save later

    if (items && items.length > 0) {
        for (const item of items) {
          // --- Select defaultCost ---
          const product = await Product.findById(item.product).select('name quantity price defaultCost maxStock stockStatus'); //.session(session);
          if (!product) throw new Error(`Product with ID ${item.product} not found.`);
          if (product.quantity < item.quantity) throw new Error(`Insufficient stock for ${product.name}. Only ${product.quantity} left.`);

          const stockBefore = product.quantity;
          product.quantity -= item.quantity; // Decrease stock
          productsToUpdate.push(product); // Add to list to save later

          movementsToLog.push({
              product: product._id, type: 'SALE', quantityChange: -item.quantity,
              stockBefore, recordedBy: req.user.id
              // referenceId will be added after sale save
          });

          const salePrice = product.price; // Use current selling price
          calculatedTotal += item.quantity * salePrice;

          // --- Store price and COST OF GOODS SOLD ---
          processedItems.push({
            product: item.product,
            quantity: item.quantity,
            priceAtTime: salePrice,
            costOfGoodsSold: product.defaultCost || 0 // Use defaultCost, fallback to 0
          });
          // --- END ---
        }
    }

    if (services && services.length > 0) {
      for (const serviceItem of services) {
        const service = await Service.findById(serviceItem.service); //.session(session);
        if (!service || service.status !== 'active') throw new Error(`Service with ID ${serviceItem.service} not found or is inactive.`);
        calculatedTotal += service.charge;
        processedServices.push({ service: service._id, priceAtTime: service.charge });
      }
    }

    // --- Save Product stock changes ---
    for (const prod of productsToUpdate) {
        await prod.save(); //{ session });
        // Trigger stock check AFTER saving the product update
        await checkStockLevelAndNotify(prod, io); // Pass the updated product
    }
    // ---

    const sale = new Sale({
      items: processedItems,
      services: processedServices,
      totalAmount: calculatedTotal,
      recordedBy: req.user.id,
      customer: customerId || undefined,
      motorcycle: motorcycleId || undefined,
    });
    const createdSale = await sale.save(); //{ session });

    // --- Log movements after sale is saved ---
    for (const movement of movementsToLog) {
        movement.referenceId = createdSale._id; // Add reference ID now
        await logMovement(movement);
    }
    // ---

    logAction(req.user, 'PROCESS_SALE', `Processed sale #${createdSale._id} with a total of ₱${calculatedTotal.toFixed(2)}.`, { entityType: 'Sale', entityId: createdSale._id });

    // Commit transaction if using sessions
    // await session.commitTransaction();
    // session.endSession();

    // Populate for response (no changes needed here)
    const populatedSale = await Sale.findById(createdSale._id)
      .populate('recordedBy', 'fullName')
      .populate('items.product', 'name') // Only need name now
      .populate({ path: 'services.service', select: 'name' })
      .populate('customer', 'name')
      .populate('motorcycle', 'make model plateNumber');

    res.status(201).json(populatedSale);

  } catch (error) {
    // Abort transaction on error if using sessions
    // await session.abortTransaction();
    // session.endSession();
    console.error("Error creating sale:", error);
    res.status(400).json({ message: error.message || "An unexpected error occurred while processing the sale." });
  }
};


// --- getAllSales, getSaleById, searchSales, uploadReceiptImage remain unchanged ---
const getAllSales = async (req, res) => { /* ... unchanged ... */
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
const getSaleById = async (req, res) => { /* ... unchanged ... */
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
const searchSales = async (req, res) => { /* ... unchanged ... */
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
const uploadReceiptImage = async (req, res) => { /* ... unchanged ... */
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Sale not found.' });
    if (!req.file) return res.status(400).json({ message: 'No receipt image file uploaded.' });
    const filePath = path.join('/uploads', 'receipts', req.file.filename).replace(/\\/g, '/');
    sale.customerReceiptImage = filePath;
    await sale.save();
    logAction( req.user, 'UPLOAD_SALE_RECEIPT', `Uploaded customer receipt image for Sale ID ${sale._id}. File: ${req.file.filename}`, { entityType: 'Sale', entityId: sale._id });
    const populatedSale = await Sale.findById(sale._id)
      .populate('recordedBy', 'fullName').populate('items.product', 'name')
      .populate({ path: 'services.service', select: 'name' })
      .populate('customer', 'name').populate('motorcycle', 'make model plateNumber');
    res.status(200).json({ message: 'Receipt image uploaded successfully.', filePath: filePath, sale: populatedSale });
  } catch (error) {
    console.error('Error uploading receipt image:', error);
    res.status(500).json({ message: 'Server error during receipt upload.', error: error.message });
  }
};

module.exports = { createSale, getAllSales, getSaleById, searchSales, uploadReceiptImage };