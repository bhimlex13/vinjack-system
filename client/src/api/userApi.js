// client/src/api/userApi.js
import api from './axios';

export const requestProfileUpdate = async (token, changes) => {
  return api.put('/users/profile', changes, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

// ADDED: New function for submitting the OTP
export const verifyOwnerUpdate = async (token, code) => {
  return api.post('/users/profile/verify', { code }, {
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