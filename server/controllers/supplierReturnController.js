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
  // --- MODIFIED: Removed returnDate, added new fields ---
  const { 
    supplier, 
    productsReturned, 
    notes, 
    originalPurchaseId, 
    originalPurchaseType 
  } = req.body;
  // --- END MODIFICATION ---

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
      
      const product = await Product.findById(item.product).select('name quantity consignedStock').session(session);
      
      if (!product) {
        throw new Error(`Product with ID ${item.product} not found.`);
      }
      if (product.quantity < item.quantity) {
        throw new Error(`Cannot return ${item.quantity} of ${product.name}. Only ${product.quantity} in stock.`);
      }

      const stockBefore = product.quantity;
      product.quantity -= item.quantity; 
      
      if (item.wasConsigned) {
        const consignedStock = Number(product.consignedStock) || 0;
        if (consignedStock < item.quantity) {
          throw new Error(`Cannot return ${item.quantity} consigned units of ${product.name}. Only ${consignedStock} in consigned stock.`);
        }
        product.consignedStock = consignedStock - item.quantity;
      }
      
      await product.save({ session });
      
      await logMovement({
        product: product._id,
        type: item.wasConsigned ? 'RETURN (CONSIGN)' : 'SUPPLIER_RETURN',
        quantityChange: -item.quantity,
        stockBefore,
        notes: `Reason: ${item.reason}`,
        recordedBy: req.user.id
      }, { session });
    }

    const newReturn = new SupplierReturn({
      supplier,
      productsReturned, 
      notes,
      // --- MODIFIED: Set returnDate automatically ---
      returnDate: new Date(), 
      recordedBy: req.user.id,
      // --- NEW: Save the original purchase link ---
      originalPurchase: originalPurchaseId || undefined,
      originalPurchaseType: originalPurchaseType || undefined
      // --- END NEW ---
    });

    const savedReturn = await newReturn.save({ session });

    await session.commitTransaction();

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
    
    logAction(
      req.user,
      'SUPPLIER_RETURN',
      `Created supplier return ${savedReturn._id} for supplier ${supplier}.`,
      { entityType: 'SupplierReturn', entityId: savedReturn._id }
    );
    
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