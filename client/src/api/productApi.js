// client/src/api/productApi.js
import api from './axios';

// Fetches all products (Moved from purchaseOrderApi.js)
export const getProducts = async () => {
    const response = await api.get('/products');
    return response.data;
};

// Fetches all products associated with a specific supplier ID
export const getProductsBySupplier = async (supplierId) => {
  const { data } = await api.get(`/products/by-supplier/${supplierId}`);
  return data;
};