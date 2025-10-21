// server/utils/stockManager.js
const { createNotification } = require('./notificationManager');

/**
 * Calculates the stock status based on percentage.
 * @param {number} quantity - Current stock quantity.
 * @param {number} maxStock - Maximum stock capacity.
 * @returns {string} The stock status ('Healthy', 'Low', 'Critical', 'Out of Stock').
 */
const getStockStatus = (quantity, maxStock) => {
  if (quantity <= 0) {
    return 'Out of Stock';
  }
  
  // Ensure maxStock is at least 1 to avoid division by zero
  const safeMaxStock = Math.max(1, maxStock || 1);
  const percentage = (quantity / safeMaxStock) * 100;

  if (percentage <= 10) {
    return 'Critical';
  }
  if (percentage <= 25) {
    return 'Low';
  }
  return 'Healthy';
};

/**
 * Checks a product's stock level, updates its status, and sends notifications
 * if the status has changed to a warning level.
 * @param {object} product - The Mongoose product document.
 * @param {object} io - The Socket.IO instance from req.app.get('socketio').
 * @returns {object} The (potentially updated) product document.
 */
const checkStockLevelAndNotify = async (product, io) => {
  const newStatus = getStockStatus(product.quantity, product.maxStock);
  const oldStatus = product.stockStatus;

  // Only proceed if the status has actually changed.
  if (newStatus === oldStatus) {
    return product; // <-- MODIFIED: Return the product
  }

  // Status has changed, so update it on the product document.
  product.stockStatus = newStatus;
  await product.save();

  // Prepare payload for notifications and socket events
  const warningPayload = {
    productName: product.name,
    remainingQuantity: product.quantity,
    image: product.image,
    link: '/inventory',
  };

  let message = '';
  let type = '';

  // Create notifications only for warning-level changes.
  switch (newStatus) {
    case 'Out of Stock':
      message = `${product.name} is now OUT OF STOCK.`;
      type = 'OUT_OF_STOCK';
      break;
    case 'Critical':
      message = `${product.name} is CRITICAL (${product.quantity} remaining, ${Math.floor((product.quantity / product.maxStock) * 100)}%).`;
      type = 'CRITICAL_STOCK';
      break;
    case 'Low':
      message = `${product.name} is low on stock (${product.quantity} remaining, ${Math.floor((product.quantity / product.maxStock) * 100)}%).`;
      type = 'LOW_STOCK';
      break;
    default:
      // No notification needed if it changed to 'Healthy'
      return product; // <-- MODIFIED: Return the product
  }

  // 1. Create database notification for Owners/Admins
  try {
    const newNotifications = await createNotification({
      recipientRole: 'Owner', // Or 'Admin', adjust as needed
      message: message,
      type: type,
      link: '/inventory',
      // --- NEW: Pass the product image to the notification ---
      image: product.image
    });
    
    // 2. Emit real-time notification to specific users
    if (newNotifications && newNotifications.length) {
      newNotifications.forEach(notification => {
        // --- MODIFIED: Ensure the full notification object (with image) is emitted ---
        io.to(notification.user.toString()).emit('new_notification', notification);
      });
    }

    // 3. Emit a general warning for any subscribed client (e.g., dashboard)
    io.emit('stock_level_warning', { ...warningPayload, type, message });

  } catch (error) {
    console.error('Error sending stock notification:', error);
  }

  return product; // <-- MODIFIED: Return the product
};

module.exports = { checkStockLevelAndNotify, getStockStatus };