// server/controllers/adjustmentController.js
const Product = require('../models/productModel');
const logMovement = require('../utils/movementLogger');
const logAction = require('../utils/logger');
// --- NEW: Import the stock manager ---
const { checkStockLevelAndNotify } = require('../utils/stockManager');

exports.createStockAdjustment = async (req, res) => {
  // --- NEW: Get socket.io instance ---
  const io = req.app.get('socketio');
  
  const { productId, adjustmentType, quantity, reason } = req.body;
  
  // --- *** FIX 1: Updated validation logic *** ---
  // Check for type *before* value
  if (!productId || !adjustmentType || typeof quantity !== 'number' || !reason) {
    return res.status(400).json({ message: 'Product, adjustment type, quantity, and reason are required.' });
  }
  // Now check for value
  if (quantity <= 0) {
    return res.status(400).json({ message: 'Quantity must be a positive number.' });
  }
  // --- *** END FIX 1 *** ---

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const stockBefore = product.quantity;
    let quantityChange;

    if (adjustmentType === 'decrease') {
      if (stockBefore < quantity) {
        return res.status(400).json({ message: `Cannot decrease stock by ${quantity}. Only ${stockBefore} available.` });
      }
      quantityChange = -Math.abs(quantity); // Ensure it's negative
      product.quantity -= quantity;
    } else if (adjustmentType === 'increase') {
      quantityChange = Math.abs(quantity); // Ensure it's positive
      product.quantity += quantity;
    } else {
      return res.status(400).json({ message: "Invalid adjustment type. Must be 'increase' or 'decrease'." });
    }
    
    // --- MODIFIED: Instead of product.save(), we call the stock manager. ---
    // This function will check the status, save the product, AND send notifications.
    const updatedProduct = await checkStockLevelAndNotify(product, io);
    // --- END MODIFICATION ---

    await logMovement({
      product: product._id,
      type: 'ADJUSTMENT',
      quantityChange,
      stockBefore,
      notes: reason, 
      recordedBy: req.user.id
    });

    logAction(
      req.user, 
      'STOCK_ADJUSTMENT', 
      `Adjusted stock for '${product.name}' by ${quantityChange}. Reason: ${reason}`
    );

    // --- MODIFIED: Send back the fully updated product ---
    res.status(200).json({ message: 'Stock adjusted successfully.', product: updatedProduct });

  } catch (error) {
    // --- *** FIX 2: Changed 5.00 to 500 *** ---
    res.status(500).json({ message: 'Server error while adjusting stock.', error: error.message });
    // --- *** END FIX 2 *** ---
  }
};