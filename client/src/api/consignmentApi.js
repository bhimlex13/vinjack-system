// client/src/api/consignmentApi.js
import api from './axios';

/**
 * Fetches all consignment payables with a status of 'Owed'.
 * @returns {Promise<Array>} A promise that resolves to an array of payable objects.
 */
export const getOwedPayables = async () => {
  try {
    const response = await api.get('/consignment/owed');
    return response.data;
  } catch (error) {
    console.error('Error fetching owed consignment payables:', error);
    throw error.response?.data || new Error('Failed to fetch owed payables');
  }
};

/**
 * Marks a specific consignment payable as 'Paid'.
 * @param {string} payableId - The ID of the payable record to update.
 * @returns {Promise<Object>} A promise that resolves to the updated payable object.
 */
export const markPayableAsPaid = async (payableId) => {
  try {
    const response = await api.put(`/consignment/${payableId}/pay`);
    return response.data;
  } catch (error) {
    console.error(`Error marking payable ${payableId} as paid:`, error);
    throw error.response?.data || new Error('Failed to mark payable as paid');
  }
};