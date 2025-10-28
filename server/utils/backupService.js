// server/utils/backupService.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '..', 'gen-lang-client-0866222620-bb13cf2fa838.json');

// --- Define backup directories ---
const localBackupDir = path.join(__dirname, '..', 'backups');
const tempDownloadDir = path.join(localBackupDir, 'downloads'); // For temporary restore downloads

// --- Ensure directories exist ---
[localBackupDir, tempDownloadDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});


let storage;
try {
  if (!fs.existsSync(keyFilePath)) {
    throw new Error(`Service account key file not found at: ${keyFilePath}. Please ensure the path is correct.`);
  }
  storage = new Storage({ keyFilename: keyFilePath });
  console.log('Google Cloud Storage client initialized successfully.');
} catch (err) {
  console.error('Failed to initialize Google Cloud Storage client:', err.message);
  storage = null; // Ensure storage is null if init fails
}

// --- List Backups from GCS ---
const listBackupsFromGCS = async () => {
  if (!storage) {
    throw new Error('Google Cloud Storage client is not initialized.');
  }
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME environment variable is not set.');
  }

  try {
    const [files] = await storage.bucket(bucketName).getFiles({
      prefix: 'vinjack-backup-', // Optional: Filter by prefix if needed
    });

    // Filter for .gz files and sort by name (usually timestamp) descending
    const backupFiles = files
      .filter(file => file.name.endsWith('.gz'))
      .map(file => ({
        name: file.name,
        // Parse timestamp from filename if possible, otherwise use updated time
        timeCreated: file.metadata.timeCreated || file.metadata.updated, // GCS metadata
        size: file.metadata.size, // File size in bytes
      }))
      .sort((a, b) => new Date(b.timeCreated) - new Date(a.timeCreated)); // Newest first

    return backupFiles;
  } catch (error) {
    console.error(`Error listing files from GCS bucket ${bucketName}:`, error);
    throw new Error('Failed to list backups from Cloud Storage.');
  }
};
// --- END List Backups ---

// --- Download Backup from GCS ---
const downloadBackupFromGCS = async (fileName) => {
  if (!storage) {
    throw new Error('Google Cloud Storage client is not initialized.');
  }
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME environment variable is not set.');
  }

  const destinationPath = path.join(tempDownloadDir, fileName); // Save in temp download dir

  try {
    console.log(`Downloading ${fileName} from GCS bucket ${bucketName} to ${destinationPath}...`);
    await storage.bucket(bucketName).file(fileName).download({
      destination: destinationPath,
    });
    console.log(`Successfully downloaded ${fileName} to ${destinationPath}.`);
    return destinationPath; // Return the path where the file was saved
  } catch (error) {
    console.error(`Error downloading file ${fileName} from GCS:`, error);
    // Clean up partial download if it exists
    if (fs.existsSync(destinationPath)) {
      try { fs.unlinkSync(destinationPath); } catch (e) { /* ignore cleanup error */ }
    }
    throw new Error(`Failed to download backup file '${fileName}' from Cloud Storage.`);
  }
};
// --- END Download Backup ---


// --- Backup Database To GCS (Modified to return filename) ---
const backupDatabaseToGCS = () => {
  // Use a Promise to handle the async nature of exec
  return new Promise((resolve, reject) => {
    if (!storage) {
      console.error('Backup Error: Google Cloud Storage client is not initialized.');
      return reject(new Error('Google Cloud Storage client is not initialized.'));
    }

    const dbUri = process.env.MONGODB_URI;
    const bucketName = process.env.GCS_BUCKET_NAME;

    if (!dbUri || !bucketName) {
      console.error('Backup Error: Missing required environment variables (MONGODB_URI, GCS_BUCKET_NAME).');
      return reject(new Error('Missing required backup environment variables.'));
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    const backupFileName = `vinjack-backup-${timestamp}.gz`;
    const backupFilePath = path.join(localBackupDir, backupFileName); // Save in main backup dir first

    // Ensure mongodump path is correct
    // --- MODIFIED: Remove hardcoded Windows path ---
    // const mongodumpPath = '"C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongodump.exe"'; // Adjust if needed
    const mongodumpPath = 'mongodump'; // Use this if mongodump is in the system PATH
    // --- END MODIFICATION ---

    const dumpCommand = `${mongodumpPath} --uri="${dbUri}" --archive="${backupFilePath}" --gzip`;

    console.log(`[${new Date().toLocaleString()}] Starting database backup...`);
    console.log(`Executing: ${dumpCommand}`); // Check this log output after the change

    exec(dumpCommand, async (error, stdout, stderr) => {
      if (error) {
        console.error(`mongodump Error: ${error.message}`);
        console.error(`mongodump Stderr: ${stderr}`);
        if (fs.existsSync(backupFilePath)) {
          try { fs.unlinkSync(backupFilePath); } catch (e) { /* ignore cleanup error */ }
        }
        return reject(new Error(`mongodump failed: ${stderr || error.message}`));
      }

      console.log(`Database dump successful: ${backupFileName}`);

      // Upload to GCS
      try {
        console.log(`Uploading ${backupFileName} to GCS bucket ${bucketName}...`);
        await storage.bucket(bucketName).upload(backupFilePath, {
          destination: backupFileName,
        });
        console.log(`Successfully uploaded ${backupFileName} to GCS.`);
        resolve(backupFileName); // --- Resolve with the filename on success ---
      } catch (gcsError) {
        console.error(`GCS Upload Error: ${gcsError.message}`);
        reject(new Error(`GCS Upload failed: ${gcsError.message}`)); // Reject on GCS error
      } finally {
        // Clean up the local backup file after upload attempt
        try {
          if (fs.existsSync(backupFilePath)) {
            fs.unlinkSync(backupFilePath);
            console.log(`Removed local backup file: ${backupFileName}`);
          }
        } catch (unlinkError) {
          console.error(`Error removing local backup file ${backupFileName}: ${unlinkError.message}`);
          // Don't reject here, upload success/failure is more important
        }
      }
    });
  });
};
// --- END Backup Database To GCS ---


// --- Restore Database from Local File (No changes needed here) ---
const restoreDatabase = (filePath) => {
  return new Promise((resolve, reject) => {
    const dbUri = process.env.MONGODB_URI;

    if (!dbUri) {
      console.error('Restore Error: Missing MONGODB_URI environment variable.');
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { console.error('Error cleaning up file after URI error:', e); }
      return reject(new Error('Server configuration error: Missing MONGODB_URI.'));
    }

    // Ensure mongorestore path is correct
    // --- MODIFIED: Remove hardcoded Windows path ---
    // const mongorestorePath = '"C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongorestore.exe"'; // Adjust if needed
    const mongorestorePath = 'mongorestore'; // Use this if mongorestore is in the system PATH
    // --- END MODIFICATION ---

    const restoreCommand = `${mongorestorePath} --uri="${dbUri}" --archive="${filePath}" --gzip --drop`;

    console.log(`[${new Date().toLocaleString()}] Starting database restore from local file: ${filePath}`);
    console.log(`Executing: ${restoreCommand}`);

    exec(restoreCommand, (error, stdout, stderr) => {
      // ALWAYS Clean up the downloaded/temporary file
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Removed temporary backup file used for restore: ${path.basename(filePath)}`);
        }
      } catch (unlinkError) {
        console.error(`Error removing temporary restore file ${path.basename(filePath)}: ${unlinkError.message}`);
        if (!error) console.warn('Restore command completed, but failed to clean up temporary file.');
      }

      // Handle command execution errors
      if (error) {
        console.error(`mongorestore Error: ${error.message}`);
        console.error(`mongorestore Stderr: ${stderr}`);
        return reject(new Error(`Restore failed. mongorestore reported: ${stderr || error.message}`));
      }
      if (stderr) console.warn(`mongorestore Stderr (Warning/Info): ${stderr}`);

      console.log(`mongorestore Stdout: ${stdout}`);
      console.log(`[${new Date().toLocaleString()}] Database restore from local file successful.`);
      resolve(stdout);
    });
  });
};
// --- END Restore Database ---

module.exports = {
  backupDatabaseToGCS,
  restoreDatabase,
  listBackupsFromGCS,     // --- EXPORT NEW FUNCTION ---
  downloadBackupFromGCS,  // --- EXPORT NEW FUNCTION ---
};