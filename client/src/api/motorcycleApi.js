// client/src/api/motorcycleApi.js
import api from './axios';

// Get all motorcycles for a specific customer
export const getMotorcyclesByCustomer = async (customerId) => {
  const response = await api.get(`/motorcycles/customer/${customerId}`);
  return response.data;
};

// Create a new motorcycle
export const createMotorcycle = async (motorcycleData) => {
  const response = await api.post('/motorcycles', motorcycleData);
  return response.data;
};

// Update an existing motorcycle
export const updateMotorcycle = async (id, motorcycleData) => {
  const response = await api.put(`/motorcycles/${id}`, motorcycleData);
  return response.data;
};

// Delete a motorcycle
export const deleteMotorcycle = async (id) => {
  const response = await api.delete(`/motorcycles/${id}`);
  return response.data;
};