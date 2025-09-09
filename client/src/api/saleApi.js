// client/src/api/saleApi.js
import api from './axios';

// Fetch a single sale by its ID
export const getSaleById = async (id) => {
  const response = await api.get(`/sales/${id}`);
  return response.data;
};