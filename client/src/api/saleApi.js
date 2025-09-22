// client/src/api/saleApi.js
import api from './axios';

// Fetch a single sale by its ID
export const getSaleById = async (id) => {
  const response = await api.get(`/sales/${id}`);
  return response.data;
};

// --- NEW: Search for sales based on criteria ---
export const searchSales = async (params) => {
  try {
    const queryParams = new URLSearchParams();
    // Append params to query string only if they have a value
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