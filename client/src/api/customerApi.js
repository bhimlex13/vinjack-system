// client/src/api/customerApi.js
import api from './axios';

// Fetch all customers
export const getCustomers = async () => {
  const response = await api.get('/customers');
  return response.data;
};

// Create a new customer
export const createCustomer = async (customerData) => {
  const response = await api.post('/customers', customerData);
  return response.data;
};

// Update an existing customer
export const updateCustomer = async (id, customerData) => {
  const response = await api.put(`/customers/${id}`, customerData);
  return response.data;
};

// Delete a customer
export const deleteCustomer = async (id) => {
  const response = await api.delete(`/customers/${id}`);
  return response.data;
};