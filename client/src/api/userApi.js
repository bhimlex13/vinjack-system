// client/src/api/userApi.js
import api from './axios';

export const requestProfileUpdate = async (changes) => {
  // MODIFIED: Removed token and manual headers
  return api.put('/users/profile', changes);
};

export const verifyOwnerUpdate = async (code) => {
  // MODIFIED: Removed token and manual headers
  return api.post('/users/profile/verify', { code });
};

export const approveUserUpdate = async (userId) => {
  // MODIFIED: Removed token and manual headers
  return api.post(`/users/${userId}/approve`, {});
};

export const rejectUserUpdate = async (userId) => {
  // MODIFIED: Removed token and manual headers
  return api.post(`/users/${userId}/reject`, {});
};