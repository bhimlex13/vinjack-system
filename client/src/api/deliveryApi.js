// client/src/api/deliveryApi.js
import api from './axios';

// Fetch all delivery records
export const getDeliveries = async () => {
  const response = await api.get('/deliveries');
  return response.data;
};