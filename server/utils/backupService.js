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

// --- NEW FUNCTION: Restore Database from File ---
const restoreDatabase = (filePath) => {
  return new Promise((resolve, reject) => {
    const dbUri = process.env.MONGODB_URI;

    if (!dbUri) {
      console.error('Restore Error: Missing MONGODB_URI environment variable.');
      return reject(new Error('Server configuration error: Missing MONGODB_URI.'));
    }

    // ** Adjust this path if your installation location is different **
    const mongorestorePath = '"C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongorestore.exe"'; // Enclose in quotes

    // Command to restore from a gzipped archive
    // --uri: Specifies the database to connect to and restore
    // --archive: Specifies the backup file to restore from
    // --gzip: Indicates the archive file is gzipped
    // --drop: Drops each collection from the database before restoring the collection from the backup
    const restoreCommand = `${mongorestorePath} --uri="${dbUri}" --archive="${filePath}" --gzip --drop`;

    console.log(`[${new Date().toLocaleString()}] Starting database restore from: ${filePath}`);
    console.log(`Executing: ${restoreCommand}`);

    exec(restoreCommand, (error, stdout, stderr) => {
      // Clean up the uploaded file *after* the command finishes, regardless of success
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Removed temporary backup file: ${path.basename(filePath)}`);
        }
      } catch (unlinkError) {
        console.error(`Error removing temporary backup file ${path.basename(filePath)}: ${unlinkError.message}`);
        // Do not reject here, the restore error (if any) is more important
      }

      // Handle command execution errors
      if (error) {
        console.error(`mongorestore Error: ${error.message}`);
        console.error(`mongorestore Stderr: ${stderr}`);
        return reject(new Error(`Restore failed: ${stderr || error.message}`));
      }

      // Handle potential warnings or info in stderr even if no error object
      if (stderr) {
        console.warn(`mongorestore Stderr (Warning/Info): ${stderr}`);
      }
      
      console.log(`mongorestore Stdout: ${stdout}`);
      console.log(`[${new Date().toLocaleString()}] Database restore successful.`);
      resolve(stdout);
    });
  });
};
// --- END NEW FUNCTION ---

module.exports = { 
  backupDatabaseToGCS,
  restoreDatabase // --- EXPORT THE NEW FUNCTION ---
};