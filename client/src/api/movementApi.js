// client/src/api/movementApi.js
import api from './axios';

// Fetch the movement history for a single product
export const getProductMovements = async (productId) => {
  const response = await api.get(`/movements/${productId}`);
  return response.data;
};