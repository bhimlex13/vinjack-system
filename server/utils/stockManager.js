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
    return product; 
  }

  // Status has changed, so update it on the product document.
  product.stockStatus = newStatus;
  await product.save();

  let message = '';
  let type = '';

  // Create notifications only for warning-level changes.
  switch (newStatus) {
    case 'Out of Stock':
      message = `${product.name} is now OUT OF STOCK.`;
      type = 'OUT_OF_STOCK';
      break;
    case 'Critical':
      message = `${product.name} is CRITICAL (${product.quantity} remaining).`;
      type = 'CRITICAL_STOCK';
      break;
    case 'Low':
      message = `${product.name} is low on stock (${product.quantity} remaining).`;
      type = 'LOW_STOCK';
      break;
    default:
      // No notification needed if it changed to 'Healthy'
      return product;
  }

  // --- THIS IS THE FIX ---

  // 1. Create database notification for Super Admins AND Admins
  try {
    const notificationPayload = {
      message: message,
      type: type,
      link: '/inventory',
      image: product.image
    };

    // Create notifications for both roles
    const [superAdminNotifications, adminNotifications] = await Promise.all([
      createNotification({ ...notificationPayload, recipientRole: 'Super Admin' }),
      createNotification({ ...notificationPayload, recipientRole: 'Admin' })
    ]);

    const allNewNotifications = [...superAdminNotifications, ...adminNotifications];
    
    // 2. Emit the single, correct 'new_notification' event to all recipients
    if (allNewNotifications && allNewNotifications.length > 0) {
      allNewNotifications.forEach(notification => {
        // This emit is now received by AuthContext.js and triggers ALL alerts
        // (navbar, toast, and modal)
        io.to(notification.user.toString()).emit('new_notification', notification);
      });
    }

    // 3. REMOVED the redundant 'stock_level_warning' emit.
    // io.emit('stock_level_warning', { ...warningPayload, type, message }); // <-- THIS IS GONE

  } catch (error) {
    console.error('Error sending stock notification:', error);
  }
  // --- END OF FIX ---

  return product; 
};

module.exports = { checkStockLevelAndNotify, getStockStatus };