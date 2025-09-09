// client/src/api/returnApi.js
import api from './axios';

// Fetch all return records
export const getReturns = async () => {
  const response = await api.get('/returns');
  return response.data;
};

// Create a new sales return
export const createReturn = async (returnData) => {
  const response = await api.post('/returns', returnData);
  return response.data;
};