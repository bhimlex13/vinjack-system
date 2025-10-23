// client/src/api/settingsApi.js
import api from './axios';

// --- Manual Backup ---

// Triggers a download of a manual .json backup
export const createManualBackup = () => {
  // We don't use the api instance here because we need to handle a blob response
  // We get the token from localStorage just like the api instance does
  const user = JSON.parse(localStorage.getItem('user'));
  const token = user ? user.token : null;

  if (!token) {
    return Promise.reject(new Error('No token found'));
  }

  return fetch(`${process.env.REACT_APP_API_URL}/api/settings/backup/create`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
};


// --- Restore from Backup ---

// Uploads a .gz backup file to restore the database
export const restoreBackup = async (formData) => {
  // formData will contain the file
  const response = await api.post('/settings/backup/restore', formData, {
    headers: {
      'Content-Type': 'multipart/form-data', // Important for file uploads
    },
    // Optional: Add upload progress tracking if needed
    // onUploadProgress: (progressEvent) => {
    //   console.log(`Upload Progress: ${Math.round((progressEvent.loaded * 100) / progressEvent.total)}%`);
    // },
  });
  return response.data;
};