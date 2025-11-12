// server/controllers/supplierReturnController.js
const SupplierReturn = require('../models/supplierReturnModel');
const Product = require('../models/productModel');
const logAction = require('../utils/logger');
const logMovement = require('../utils/movementLogger');
const { checkStockLevelAndNotify } = require('../utils/stockManager');
const mongoose = require('mongoose');

/**
 * @desc    Create a new return to a supplier
 * @route   POST /api/supplier-returns
 * @access  Admin, Super Admin
 */
const createSupplierReturn = async (req, res) => {
  const io = req.app.get('socketio');
  const { supplier, productsReturned, notes, returnDate } = req.body;

  if (!supplier || !productsReturned || productsReturned.length === 0) {
    return res.status(400).json({ message: 'Supplier and at least one product are required.' });
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    for (const item of productsReturned) {
      if (!item.product || !item.quantity || !item.reason) {
        throw new Error('Each returned product must have a product ID, quantity, and reason.');
      }
      if (item.quantity <= 0) {
        throw new Error('Return quantity must be a positive number.');
      }

      const product = await Product.findById(item.product).session(session);
      if (!product) {
        throw new Error(`Product with ID ${item.product} not found.`);
      }
      if (product.quantity < item.quantity) {
        throw new Error(`Cannot return ${item.quantity} of ${product.name}. Only ${product.quantity} in stock.`);
      }

      const stockBefore = product.quantity;
      product.quantity -= item.quantity; // Decrease stock
      
      // Save product and log movement within the transaction
      await product.save({ session });
      
      await logMovement({
        product: product._id,
        type: 'SUPPLIER_RETURN',
        quantityChange: -item.quantity,
        stockBefore,
        notes: `Reason: ${item.reason}`,
        recordedBy: req.user.id
      }, { session });

      // We'll check stock and notify *after* the transaction commits
    }

    const newReturn = new SupplierReturn({
      supplier,
      productsReturned,
      notes,
      returnDate: returnDate || new Date(),
      recordedBy: req.user.id,
    });

    const savedReturn = await newReturn.save({ session });

    await session.commitTransaction(); // Commit the transaction

    // --- Notify after commit ---
    // Go back through the products, fetch them (outside session), and notify
    try {
        for (const item of productsReturned) {
            const product = await Product.findById(item.product);
            if (product) {
                await checkStockLevelAndNotify(product, io);
            }
        }
    } catch (notificationError) {
        console.error("Failed to send stock notifications after supplier return:", notificationError);
    }
    
    // --- Log action after commit ---
    logAction(
      req.user,
      'SUPPLIER_RETURN',
      `Created supplier return ${savedReturn._id} for supplier ${supplier}.`,
      { entityType: 'SupplierReturn', entityId: savedReturn._id }
    );
    
    // Populate for response
    const populatedReturn = await SupplierReturn.findById(savedReturn._id)
                                    .populate('supplier', 'name')
                                    .populate('recordedBy', 'fullName')
                                    .populate('productsReturned.product', 'name itemCode');

    res.status(201).json(populatedReturn);

  } catch (error) {
    await session.abortTransaction();
    console.error("Error creating supplier return:", error);
    res.status(400).json({ message: error.message || "Failed to create supplier return." });
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Get all returns made to suppliers
 * @route   GET /api/supplier-returns
 * @access  Admin, Super Admin
 */
const getSupplierReturns = async (req, res) => {
  try {
    const returns = await SupplierReturn.find({})
      .sort({ returnDate: -1 })
      .populate('supplier', 'name')
      .populate('recordedBy', 'fullName')
      .populate('productsReturned.product', 'name itemCode');
      
    res.json(returns);
  } catch (error) {
    console.error("Error fetching supplier returns:", error);
    res.status(500).json({ message: 'Server error fetching supplier returns.' });
  }
};

module.exports = {
  createSupplierReturn,
  getSupplierReturns,
};