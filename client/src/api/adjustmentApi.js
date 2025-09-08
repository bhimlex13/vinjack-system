// client/src/api/adjustmentApi.js
import api from './axios';

/**
 * Creates a new stock adjustment record.
 * @param {object} adjustmentData - The data for the adjustment.
 * @param {string} adjustmentData.productId - The ID of the product.
 * @param {string} adjustmentData.adjustmentType - 'increase' or 'decrease'.
 * @param {number} adjustmentData.quantity - The amount to adjust by (a positive number).
 * @param {string} adjustmentData.reason - The reason for the adjustment.
 */
export const createStockAdjustment = async (adjustmentData) => {
  const response = await api.post('/adjustments', adjustmentData);
  return response.data;
};