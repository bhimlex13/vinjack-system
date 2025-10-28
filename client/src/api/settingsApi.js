// client/src/api/settingsApi.js
import api from './axios'; // Assuming your configured axios instance is here

/**
 * Triggers a manual backup process to Google Cloud Storage.
 * @returns {Promise<Object>} - The response data from the server (e.g., { message: '...' }).
 */
export const triggerManualBackupToGCS = async () => {
  try {
    // Use the axios instance for POST
    // No request body needed for this trigger
    const response = await api.post('/settings/backup/gcs');
    return response.data; // Return the JSON response (e.g., { message: '...' })
  } catch (error) {
    console.error("Error triggering manual backup to GCS:", error.response || error);
    throw error; // Rethrow error for component's catch block
  }
};

/**
 * Fetches the list of available backup files from Google Cloud Storage.
 * @returns {Promise<Array<Object>>} - An array of backup file objects (e.g., [{ name, timeCreated, size }]).
 */
export const listGCSBackups = async () => {
    try {
        const response = await api.get('/settings/backup/list');
        return response.data; // Returns the array of backup file info
    } catch (error) {
        console.error("Error fetching backup list from GCS:", error.response || error);
        throw error; // Rethrow error for component's catch block
    }
};


/**
 * Initiates restoring the database from a specified GCS backup file.
 * @param {string} fileName - The name of the .gz file in GCS to restore from.
 * @returns {Promise<Object>} - The response data from the server (e.g., { message: '...' }).
 */
export const restoreBackup = async (fileName) => {
  try {
    // Send the filename in the request body as JSON
    const response = await api.post('/settings/backup/restore', { fileName }); // No FormData needed
    return response.data; // Return the JSON response (e.g., { message: '...' })
  } catch (error) {
    console.error("Error initiating restore from GCS:", error.response || error);
    // Rethrow error for component's catch block
    throw error;
  }
};

// Remove the old createManualBackup function (JSON download) if no longer needed
// export const createManualBackup = async () => { ... };

// Config functions remain the same if needed
// export const getBackupConfig = async () => { ... };
// export const updateBackupConfig = async (config) => { ... };