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

// Update a purchase order
export const updatePurchaseOrder = async (id, purchaseOrderData) => {
  const response = await api.put(`/purchase-orders/${id}`, purchaseOrderData);
  return response.data;
};

// --- MODIFIED: This function is rewritten to handle file uploads ---
// It now accepts the items and the receipt file, and sends them as FormData.
export const receivePurchaseOrder = async (id, items, receiptImageFile) => {
  const formData = new FormData();

  // 'items' must be converted to a JSON string to be sent with a file.
  formData.append('items', JSON.stringify(items));

  // Append the file if it exists. The key 'receiptImage' MUST match the backend middleware.
  if (receiptImageFile) {
    formData.append('receiptImage', receiptImageFile);
  }

  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  };

  const response = await api.post(`/purchase-orders/${id}/receive`, formData, config);
  return response.data;
};

// Cancel a purchase order
export const cancelPurchaseOrder = async (id) => {
  const response = await api.post(`/purchase-orders/${id}/cancel`);
  return response.data;
};

// Fetch all suppliers (for the dropdown in the form)
export const getSuppliers = async () => {
    const response = await api.get('/suppliers');
    return response.data;
};


// --- NEW FUNCTIONS FOR SUPPLIER REVIEW FLOW ---

// Fetch a PO using the public supplier token
export const getPurchaseOrderByToken = async (token) => {
  const response = await api.get(`/purchase-orders/supplier/${token}`);
  return response.data;
};

// Submit updates from the supplier's review page
export const updateBySupplier = async (token, supplierData) => {
  const response = await api.put(`/purchase-orders/supplier/${token}`, supplierData);
  return response.data;
};

// Approve a PO after supplier has reviewed it
export const approveSupplierChanges = async (id) => {
  const response = await api.post(`/purchase-orders/${id}/approve`);
  return response.data;
};