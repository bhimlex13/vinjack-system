// client/src/api/serviceApi.js
import api from './axios';

// Get all services (can optionally filter by status, e.g., 'active')
export const getServices = async (status = '') => {
  const response = await api.get(`/services${status ? `?status=${status}` : ''}`);
  return response.data;
};

// Create a new service
export const createService = async (serviceData) => {
  const response = await api.post('/services', serviceData);
  return response.data;
};

// Update an existing service by its ID
export const updateService = async (id, serviceData) => {
  const response = await api.put(`/services/${id}`, serviceData);
  return response.data;
};

// Delete a service by its ID
export const deleteService = async (id) => {
  const response = await api.delete(`/services/${id}`);
  return response.data;
};