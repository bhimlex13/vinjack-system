// client/src/api/userApi.js
import api from './axios';

// ADDED: For admin to create a new user
export const createUser = async (userData) => {
  return api.post('/users/create', userData);
};

// ADDED: For a new user to change their temporary password
export const forceChangePassword = async (passwordData) => {
  return api.put('/users/force-change-password', passwordData);
};

export const requestProfileUpdate = async (changes) => {
  return api.put('/users/profile', changes);
};

export const verifyOwnerUpdate = async (code) => {
  return api.post('/users/profile/verify', { code });
};

export const approveUserUpdate = async (userId) => {
  return api.post(`/users/${userId}/approve`, {});
};

export const rejectUserUpdate = async (userId) => {
  return api.post(`/users/${userId}/reject`, {});
};