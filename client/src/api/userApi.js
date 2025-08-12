// client/src/api/userApi.js
import api from './axios'; // <-- Import your configured 'api' instance

export const requestProfileUpdate = async (token, changes) => {
  return api.put('/users/profile', changes, { // <-- Use 'api.put' instead of 'axios.put'
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const approveUserUpdate = async (token, userId) => {
  return api.post(`/users/${userId}/approve`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const rejectUserUpdate = async (token, userId) => {
  return api.post(`/users/${userId}/reject`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
};