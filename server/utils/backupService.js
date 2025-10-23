// server/utils/backupService.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '..', 'gen-lang-client-0866222620-bb13cf2fa838.json'); // Adjusted path example

let storage;
try {
  if (!fs.existsSync(keyFilePath)) {
    throw new Error(`Service account key file not found at: ${keyFilePath}. Please ensure the path is correct.`);
  }
  storage = new Storage({ keyFilename: keyFilePath });
  console.log('Google Cloud Storage client initialized successfully.');
} catch (err) {
  console.error('Failed to initialize Google Cloud Storage client:', err.message);
  storage = null;
}

const backupDatabaseToGCS = async () => {
  if (!storage) {
    console.error('Backup Error: Google Cloud Storage client is not initialized.');
    return;
  }

  // --- ADD THESE LOGS ---
  // console.log('--- Inside backupDatabaseToGCS ---');
  // console.log('process.env.MONGODB_URI:', process.env.MONGODB_URI);
  // console.log('process.env.GCS_BUCKET_NAME:', process.env.GCS_BUCKET_NAME);
  // --- END ADDED LOGS ---

  const dbUri = process.env.MONGODB_URI;
  const bucketName = process.env.GCS_BUCKET_NAME;

  if (!dbUri || !bucketName) {
    console.error('Backup Error: Missing required environment variables (MONGODB_URI, GCS_BUCKET_NAME).');
    return;
  }

  const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
  const backupFileName = `vinjack-backup-${timestamp}.gz`;
  const backupDir = path.join(__dirname, '..', 'backups');
  const backupFilePath = path.join(backupDir, backupFileName);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // --- MODIFICATION: Use the full path to mongodump.exe ---
  // ** Adjust this path if your installation location is different **
  const mongodumpPath = '"C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongodump.exe"'; // Enclose in quotes for paths with spaces

  // Construct mongodump command using the full path
  const dumpCommand = `${mongodumpPath} --uri="${dbUri}" --archive="${backupFilePath}" --gzip`;
  // --- END MODIFICATION ---

  console.log(`[${new Date().toLocaleString()}] Starting database backup...`);
  console.log(`Executing: ${dumpCommand}`); // Log the command being executed

  exec(dumpCommand, async (error, stdout, stderr) => {
    if (error) {
      console.error(`mongodump Error: ${error.message}`);
      console.error(`mongodump Stderr: ${stderr}`);
      if (fs.existsSync(backupFilePath)) {
        fs.unlinkSync(backupFilePath);
      }
      return;
    }

    console.log(`Database dump successful: ${backupFileName}`);

    // Upload to GCS
    try {
      console.log(`Uploading ${backupFileName} to GCS bucket ${bucketName}...`);
      await storage.bucket(bucketName).upload(backupFilePath, {
        destination: backupFileName,
      });
      console.log(`Successfully uploaded ${backupFileName} to GCS.`);
    } catch (gcsError) {
      console.error(`GCS Upload Error: ${gcsError.message}`);
    } finally {
      // Clean up the local backup file
      try {
        if (fs.existsSync(backupFilePath)) {
          fs.unlinkSync(backupFilePath);
          console.log(`Removed local backup file: ${backupFileName}`);
        }
      } catch (unlinkError) {
        console.error(`Error removing local backup file ${backupFileName}: ${unlinkError.message}`);
      }
    }
  });
};

module.exports = { backupDatabaseToGCS };