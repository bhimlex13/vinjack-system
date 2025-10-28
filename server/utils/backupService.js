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

// --- NEW: Define binary paths based on environment ---
// Render sets the RENDER variable to 'true' in its environment
const isRender = process.env.RENDER === 'true';

// If on Render, use the binaries we installed. Otherwise, use the system's global path.
const mongodumpPath = isRender
  ? path.join(__dirname, '..', 'bin', 'mongodump') // Path from .../server/utils to .../server/bin
  : 'mongodump';

const mongorestorePath = isRender
  ? path.join(__dirname, '..', 'bin', 'mongorestore')
  : 'mongorestore';
// --- END NEW ---


// --- List Backups from GCS (Unchanged) ---
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

    const backupFiles = files
      .filter(file => file.name.endsWith('.gz'))
      .map(file => ({
        name: file.name,
        timeCreated: file.metadata.timeCreated || file.metadata.updated,
        size: file.metadata.size,
      }))
      .sort((a, b) => new Date(b.timeCreated) - new Date(a.timeCreated));

    return backupFiles;
  } catch (error) {
    console.error(`Error listing files from GCS bucket ${bucketName}:`, error);
    throw new Error('Failed to list backups from Cloud Storage.');
  }
};

// --- Download Backup from GCS (Unchanged) ---
const downloadBackupFromGCS = async (fileName) => {
  if (!storage) {
    throw new Error('Google Cloud Storage client is not initialized.');
  }
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME environment variable is not set.');
  }

  const destinationPath = path.join(tempDownloadDir, fileName); 

  try {
    console.log(`Downloading ${fileName} from GCS bucket ${bucketName} to ${destinationPath}...`);
    await storage.bucket(bucketName).file(fileName).download({
      destination: destinationPath,
    });
    console.log(`Successfully downloaded ${fileName} to ${destinationPath}.`);
    return destinationPath; 
  } catch (error) {
    console.error(`Error downloading file ${fileName} from GCS:`, error);
    if (fs.existsSync(destinationPath)) {
      try { fs.unlinkSync(destinationPath); } catch (e) { /* ignore cleanup error */ }
    }
    throw new Error(`Failed to download backup file '${fileName}' from Cloud Storage.`);
  }
};


// --- Backup Database To GCS (Modified) ---
const backupDatabaseToGCS = () => {
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
    const backupFilePath = path.join(localBackupDir, backupFileName); 

    // --- MODIFIED: Use the dynamic mongodumpPath variable ---
    const dumpCommand = `${mongodumpPath} --uri="${dbUri}" --archive="${backupFilePath}" --gzip`;
    // --- END MODIFICATION ---

    console.log(`[${new Date().toLocaleString()}] Starting database backup...`);
    console.log(`Executing: ${dumpCommand}`); 

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

      try {
        console.log(`Uploading ${backupFileName} to GCS bucket ${bucketName}...`);
        await storage.bucket(bucketName).upload(backupFilePath, {
          destination: backupFileName,
        });
        console.log(`Successfully uploaded ${backupFileName} to GCS.`);
        resolve(backupFileName); 
      } catch (gcsError) {
        console.error(`GCS Upload Error: ${gcsError.message}`);
        reject(new Error(`GCS Upload failed: ${gcsError.message}`)); 
      } finally {
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
  });
};
// --- END Backup Database To GCS ---


// --- Restore Database from Local File (Modified) ---
const restoreDatabase = (filePath) => {
  return new Promise((resolve, reject) => {
    const dbUri = process.env.MONGODB_URI;

    if (!dbUri) {
      console.error('Restore Error: Missing MONGODB_URI environment variable.');
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { console.error('Error cleaning up file after URI error:', e); }
      return reject(new Error('Server configuration error: Missing MONGODB_URI.'));
    }

    // --- MODIFIED: Use the dynamic mongorestorePath variable ---
    const restoreCommand = `${mongorestorePath} --uri="${dbUri}" --archive="${filePath}" --gzip --drop`;
    // --- END MODIFICATION ---

    console.log(`[${new Date().toLocaleString()}] Starting database restore from local file: ${filePath}`);
    console.log(`Executing: ${restoreCommand}`);

    exec(restoreCommand, (error, stdout, stderr) => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Removed temporary backup file used for restore: ${path.basename(filePath)}`);
        }
      } catch (unlinkError) {
        console.error(`Error removing temporary restore file ${path.basename(filePath)}: ${unlinkError.message}`);
        if (!error) console.warn('Restore command completed, but failed to clean up temporary file.');
      }

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
  listBackupsFromGCS,     
  downloadBackupFromGCS,  
};