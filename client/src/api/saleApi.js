// client/src/api/saleApi.js
import api from './axios';

// Fetch a single sale by its ID
export const getSaleById = async (id) => {
  const response = await api.get(`/sales/${id}`);
  return response.data;
};

// Search for sales based on criteria
export const searchSales = async (params) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.customerId) queryParams.append('customerId', params.customerId);
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    
    const response = await api.get(`/sales/search?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error searching sales:', error);
    throw error;
  }
};

// --- NEW: Function to save the Base64 string ---
export const saveReceiptString = async (saleId, receiptImageString) => {
  try {
    // This POST request sends the string in the request body as JSON
    const response = await api.post(`/sales/${saleId}/save-receipt-string`, {
      receiptImageString: receiptImageString // Key matches backend expectation
    });
    // Expecting { message, sale } back from the backend
    return response.data;
  } catch (error) {
    console.error('Error saving receipt string:', error);
    throw error; // Re-throw to be caught by the component
  }
};
// --- END NEW ---