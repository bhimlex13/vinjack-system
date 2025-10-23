// server/middleware/backupUploadMiddleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define the temporary upload directory for restores
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
    // Keep the original filename, it's temporary
    cb(null, file.originalname); 
  }
});

// File filter to accept only .gz files
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname);
  if (ext !== '.gz') {
    // Reject file
    cb(new Error('File upload failed: Only .gz (gzipped archive) files are allowed.'), false);
  } else {
    // Accept file
    cb(null, true);
  }
};

// Configure multer
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 100 // 100 MB file size limit
  }
}).single('backupFile'); // 'backupFile' must match the FormData key from the client

// Custom middleware to handle multer errors gracefully
const handleBackupUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred (e.g., file size limit)
      return res.status(400).json({ message: `Multer error: ${err.message}` });
    } else if (err) {
      // An unknown error occurred (e.g., file type mismatch from fileFilter)
      return res.status(400).json({ message: err.message });
    }
    
    // Check if a file was actually uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No backup file was uploaded.' });
    }

    // Everything went fine, proceed to the controller
    next();
  });
};

module.exports = { handleBackupUpload };