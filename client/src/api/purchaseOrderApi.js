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

export const receivePurchaseOrder = async (id, items, deliveryReceiptUrl) => {
  const payload = {
    items: items,
    deliveryReceiptUrl: deliveryReceiptUrl 
  };
  const response = await api.post(`/purchase-orders/${id}/receive`, payload);
  return response.data;
};

// Cancel a purchase order
export const cancelPurchaseOrder = async (id) => {
  const response = await api.post(`/purchase-orders/${id}/cancel`);
  return response.data;
};

// Fetch all suppliers
export const getSuppliers = async () => {
    const response = await api.get('/suppliers');
    return response.data;
};

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

// Approve a PO (Standard or Manual Consignment)
export const approveSupplierChanges = async (id) => {
  const response = await api.post(`/purchase-orders/${id}/approve`);
  return response.data;
};

// Upload initial agreement (Manual Flow)
export const uploadSignedAgreement = async (id, signedAgreementUrl) => {
  const payload = { signedAgreementUrl }; 
  const response = await api.post(`/purchase-orders/${id}/upload-agreement`, payload);
  return response.data;
};

// --- NEW: Upload Countersigned Agreement (System Consignment Final Step) ---
export const uploadCountersignedAgreement = async (id, countersignedAgreementUrl) => {
  const payload = { countersignedAgreementUrl };
  const response = await api.post(`/purchase-orders/${id}/upload-countersigned`, payload);
  return response.data;
};
// --- END NEW ---