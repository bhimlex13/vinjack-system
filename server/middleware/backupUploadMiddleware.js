// server/middleware/backupUploadMiddleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define the temporary upload directory relative to this file
// server/backups/uploads/
const uploadDir = path.join(__dirname, '..', 'backups', 'uploads');

// Ensure the upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up storage configuration for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Save files to the 'server/backups/uploads' directory
  },
  filename: (req, file, cb) => {
    // Use a timestamp and original name to avoid conflicts, keep extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    // Example: backupFile-1678886400000-123456789.gz
  }
});

// File filter to accept only .gz files
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname);
  if (ext !== '.gz') {
    // Reject file with a specific error message
    cb(new Error('File upload failed: Only .gz (gzipped archive) files are allowed.'), false);
  } else {
    // Accept file
    cb(null, true);
  }
};

// Configure multer
// 'backupFile' must match the FormData key used in the frontend
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 100 // 100 MB file size limit (adjust as needed)
  }
}).single('backupFile');

// Custom middleware wrapper to handle multer errors gracefully
const handleBackupUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Handle known Multer errors (e.g., file size limit)
      console.error('Multer Error:', err);
      return res.status(400).json({ message: `Upload Error: ${err.message}.` });
    } else if (err) {
      // Handle custom errors (e.g., wrong file type from fileFilter)
      console.error('File Filter/Unknown Upload Error:', err);
      return res.status(400).json({ message: err.message || 'File upload failed.' });
    }

    // Check if a file was actually uploaded (Multer might not throw error if no file)
    if (!req.file) {
      return res.status(400).json({ message: 'No backup file was uploaded.' });
    }

    // File uploaded successfully, proceed to the controller
    next();
  });
};

module.exports = { handleBackupUpload };