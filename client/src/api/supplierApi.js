// client/src/api/supplierApi.js
import api from './axios';

// --- Basic Supplier CRUD ---

export const getSuppliers = async () => {
  const response = await api.get('/suppliers');
  return response.data;
};

export const createSupplier = async (supplierData) => {
  const response = await api.post('/suppliers', supplierData);
  return response.data;
};

export const updateSupplier = async (id, supplierData) => {
  const response = await api.put(`/suppliers/${id}`, supplierData);
  return response.data;
};

export const deleteSupplier = async (id) => {
  const response = await api.delete(`/suppliers/${id}`);
  return response.data;
};

// --- APIs FOR PRODUCT CATALOG ---

/**
 * Fetches the list of products associated with this supplier,
 * including the specific cost and note for each.
 */
export const getSupplierProductCatalog = async (supplierId) => {
  const response = await api.get(`/suppliers/${supplierId}/products`);
  return response.data; // Now returns { product, cost, note }
};

/**
 * Updates the entire product catalog for a supplier.
 * @param {string} supplierId - The ID of the supplier.
 * @param {Array<Object>} products - An array of { product: 'productId', cost: 123.45, note: '...' }
 */
export const updateSupplierProductCatalog = async (supplierId, products) => {
  // Payload now includes the note
  const response = await api.put(`/suppliers/${supplierId}/products`, { products });
  return response.data;
};

// --- NEW FUNCTION FOR ORDER HISTORY ---
/**
 * Fetches the combined order history (POs and Deliveries) for a supplier.
 * @param {string} supplierId - The ID of the supplier.
 * @returns {Promise<Array>} A promise that resolves to an array of history items.
 */
export const getSupplierOrderHistory = async (supplierId) => {
  if (!supplierId) throw new Error("Supplier ID is required.");
  try {
    const response = await api.get(`/suppliers/${supplierId}/history`);
    return response.data;
  } catch (error) {
    console.error('Error fetching supplier order history:', error);
    throw error.response?.data || new Error('Failed to fetch order history');
  }
};
// --- END NEW FUNCTION ---