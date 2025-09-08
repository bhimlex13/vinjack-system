// client/src/api/purchaseOrderApi.js
import api from './axios';

// Fetch all purchase orders
export const getPurchaseOrders = async () => {
  const response = await api.get('/purchase-orders');
  return response.data;
};

// Fetch a single purchase order by its ID
export const getPurchaseOrderById = async (id) => {
  const response = await api.get(`/purchase-orders/${id}`);
  return response.data;
};

// Create a new purchase order
export const createPurchaseOrder = async (purchaseOrderData) => {
  const response = await api.post('/purchase-orders', purchaseOrderData);
  return response.data;
};

// Mark a purchase order as received
export const receivePurchaseOrder = async (id) => {
  const response = await api.post(`/purchase-orders/${id}/receive`);
  return response.data;
};

// Fetch all suppliers (for the dropdown in the form)
export const getSuppliers = async () => {
    const response = await api.get('/suppliers');
    return response.data;
};

// Fetch all products (for the dropdown in the form)
export const getProducts = async () => {
    const response = await api.get('/products');
    return response.data;
};