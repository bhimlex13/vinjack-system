// server/utils/movementLogger.js
const Movement = require('../models/movementModel');

/**
 * Logs a product stock movement to the database.
 */
const logMovement = async (movementData) => {
  try {
    const stockAfter = movementData.stockBefore + movementData.quantityChange;
    
    const movement = new Movement({
      ...movementData,
      stockAfter
    });
    
    await movement.save();
  } catch (error) {
    console.error('Failed to log product movement:', error);
  }
};

module.exports = logMovement;