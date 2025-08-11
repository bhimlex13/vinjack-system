import axios from 'axios';

export const requestProfileUpdate = async (token, changes) => {
  return axios.put('/api/users/profile', changes, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const approveUserUpdate = async (token, userId) => {
  return axios.post(`/api/users/${userId}/approve`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const rejectUserUpdate = async (token, userId) => {
  return axios.post(`/api/users/${userId}/reject`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
};
