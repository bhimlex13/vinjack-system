// server/utils/gcsStorage.js
const { Storage } = require('@google-cloud/storage');
const path = require('path');
require('dotenv').config();

// Reuse the key file path logic
const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '..', 'gen-lang-client-0866222620-bb13cf2fa838.json');
const bucketName = process.env.GCS_BUCKET_NAME;

let storage;
let bucket;

try {
  console.log(`[GCS DEBUG] Initializing GCS... KeyPath: ${keyFilePath}, Bucket: ${bucketName}`);
  if (keyFilePath) { 
    storage = new Storage({ keyFilename: keyFilePath });
    if (bucketName) {
        bucket = storage.bucket(bucketName);
        console.log('[GCS DEBUG] GCS Storage initialized successfully.');
    } else {
        console.error('[GCS DEBUG] ERROR: GCS_BUCKET_NAME is not defined in .env');
    }
  }
} catch (err) {
  console.error('[GCS DEBUG] Failed to initialize GCS:', err.message);
}

/**
 * Uploads a file buffer to Google Cloud Storage
 */
const uploadFileToGCS = async (buffer, destinationPath, mimeType = 'application/pdf') => {
    if (!bucket) {
        throw new Error('GCS Bucket is not initialized.');
    }

    const file = bucket.file(destinationPath);

    console.log(`[GCS DEBUG] Uploading file to: ${destinationPath}`);
    await file.save(buffer, {
        contentType: mimeType,
        resumable: false
    });

    console.log(`[GCS DEBUG] Upload complete: ${destinationPath}`);

    // Return the internal path (e.g., "consignment-agreements/file.pdf")
    return destinationPath; 
};

/**
 * Generates a temporary signed URL for a GCS file
 */
const generateSignedUrl = async (filePath) => {
    if (!bucket) {
        console.error('[GCS DEBUG] Cannot sign URL: Bucket not initialized.');
        return null;
    }
    
    // Handle Legacy Full URLs: Strip the domain if it exists
    const publicPrefix = `https://storage.googleapis.com/${bucketName}/`;
    if (filePath.startsWith(publicPrefix)) {
        filePath = filePath.replace(publicPrefix, '');
    }

    try {
        const options = {
            version: 'v4',
            action: 'read',
            expires: Date.now() + 60 * 60 * 1000, // 60 minutes
        };

        const [url] = await bucket.file(filePath).getSignedUrl(options);
        return url;
    } catch (error) {
        console.error(`[GCS DEBUG] Error generating signed URL for ${filePath}:`, error);
        return null;
    }
};

/**
 * Downloads a file from GCS into a Buffer (for email attachments)
 */
const downloadFileFromGCS = async (filePath) => {
    if (!bucket) throw new Error('GCS Bucket is not initialized.');
    
    // Handle Legacy Full URLs
    const publicPrefix = `https://storage.googleapis.com/${bucketName}/`;
    if (filePath.startsWith(publicPrefix)) {
        filePath = filePath.replace(publicPrefix, '');
    }

    try {
        console.log(`[GCS DEBUG] Downloading file into buffer: ${filePath}`);
        const [buffer] = await bucket.file(filePath).download();
        return buffer;
    } catch (error) {
        console.error(`[GCS DEBUG] Error downloading file ${filePath}:`, error);
        return null;
    }
};

module.exports = { uploadFileToGCS, generateSignedUrl, downloadFileFromGCS };