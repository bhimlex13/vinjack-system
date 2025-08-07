// client/src/api/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL}/api`,
});

// This is the interceptor. It runs before every single request.
api.interceptors.request.use(
  (config) => {
    // 1. Get the user info from localStorage
    const user = JSON.parse(localStorage.getItem('user'));

    // 2. If the user and token exist, add the token to the headers
    if (user && user.token) {
      config.headers['Authorization'] = `Bearer ${user.token}`;
    }
    
    // 3. Return the modified request configuration
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;