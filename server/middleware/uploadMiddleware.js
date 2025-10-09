// server/middleware/uploadMiddleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // --- ADDED: Node.js File System module

const uploadDir = './uploads/receipts/';

// --- ADDED: Ensure the upload directory exists ---
fs.mkdirSync(uploadDir, { recursive: true });

// Set up storage engine
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir); // Use the variable here
  },
  filename: function(req, file, cb) {
    // Create a unique filename: receipt-timestamp.extension
    cb(null, `receipt-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Check File Type
function checkFileType(file, cb) {
  // Allowed extensions
  const filetypes = /jpeg|jpg|png|pdf/; // Removed 'gif' as it's less common for receipts
  // Check extension
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime type
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Error: You can only upload images (jpeg, jpg, png) or PDF files!'));
  }
}

// Initialize upload variable
const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // Limit file size to 5MB
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
}).single('receiptImage'); // 'receiptImage' is the name of the input field in the form

// We wrap the upload middleware to provide better error handling
const uploadWithErrorHandler = (req, res, next) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            return res.status(400).json({ message: `File Upload Error: ${err.message}` });
        } else if (err) {
            // An unknown error occurred when uploading.
            return res.status(400).json({ message: err.message });
        }
        // Everything went fine.
        next();
    });
};

module.exports = uploadWithErrorHandler;