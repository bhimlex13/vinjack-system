// client/src/api/deliveryApi.js
import api from './axios';

// Fetch all delivery records
export const getDeliveries = async () => {
  const response = await api.get('/deliveries');
  return response.data;
};

// --- NEW: Centralized function to create a direct delivery ---
export const createDelivery = async (deliveryData) => {
  // deliveryData should contain:
  // { supplier, deliveryDate, deliveryType, productsReceived, totalCost }
  const response = await api.post('/deliveries', deliveryData);
  return response.data;
};
// --- END NEW ---