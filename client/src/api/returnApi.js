// client/src/api/returnApi.js
import api from './axios';

// Fetch all return records
export const getReturns = async () => {
  const response = await api.get('/returns');
  return response.data;
};

// Create a new sales return
export const createReturn = async (returnData) => {
  // --- MODIFIED: Ensure totalRefundAmount is sent ---
  // Ensure the payload structure matches what the backend expects
  const payload = {
    originalSaleId: returnData.originalSaleId,
    itemsReturned: returnData.itemsReturned,
    servicesReturned: returnData.servicesReturned, // Add if needed
    reason: returnData.reason,
    outcome: returnData.outcome,
    totalRefundAmount: returnData.totalRefundAmount // Make sure this is passed from CreateReturnModal
  };
  const response = await api.post('/returns', payload);
  return response.data;
};

// --- NEW FUNCTION: Fetch returns by original Sale ID ---
export const getReturnsBySaleId = async (saleId) => {
  if (!saleId) {
    throw new Error("Sale ID is required to fetch associated returns.");
  }
  const response = await api.get(`/returns/by-sale/${saleId}`);
  return response.data; // Should return an array of returns (or empty array)
};
// --- END NEW FUNCTION ---

// --- Optional: Add function to get single return details if needed elsewhere ---
export const getReturnDetails = async (returnId) => {
    if (!returnId) {
        throw new Error("Return ID is required.");
    }
    const response = await api.get(`/returns/${returnId}`);
    return response.data;
}