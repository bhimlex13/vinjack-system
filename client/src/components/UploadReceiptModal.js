// client/src/components/UploadReceiptModal.js
import React, { useState } from 'react';
// --- MODIFIED: Import the new API function ---
import { saveReceiptString } from '../api/saleApi';
import { toast } from 'react-toastify';

// MUI Imports
import {
  Box, Button, Typography, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle'; // Keep this icon
import UploadFileIcon from '@mui/icons-material/UploadFile';

// --- NEW: Add the resizeImage function (copied from ProductForm.js) ---
const resizeImage = (file, maxWidth, maxHeight) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        // Basic resizing logic
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        // Use image/jpeg for smaller file size, adjust quality (0.9 = 90%)
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
// --- END NEW ---


const UploadReceiptModal = ({ open, onClose, saleId, onUploadSuccess }) => {
  // --- MODIFIED: State for Base64 string and file name ---
  const [base64Image, setBase64Image] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  // --- END MODIFICATION ---
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // --- MODIFIED: Handle file selection, resize, and convert to Base64 ---
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Basic type check on the frontend for immediate feedback
      const allowedTypes = ['image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Please upload JPG or PNG.');
        setSelectedFileName('');
        setBase64Image(null);
        e.target.value = null; // Clear the input
        return;
      }
      // Size check (e.g., 5MB limit)
      if (file.size > 5 * 1024 * 1024) {
          setError('File size exceeds 5MB limit.');
          setSelectedFileName('');
          setBase64Image(null);
          e.target.value = null; // Clear the input
          return;
      }

      setIsLoading(true); // Show loading while processing
      setError('');
      setSelectedFileName(file.name);
      try {
        // Resize and convert to Base64 (adjust dimensions as needed)
        const resizedImage = await resizeImage(file, 800, 1200); // Max 800px wide, 1200px tall
        setBase64Image(resizedImage);
        toast.success("Image is ready to upload.");
      } catch (err) {
        setError("Failed to process image. Please try another file.");
        setSelectedFileName('');
        setBase64Image(null);
        console.error("Image processing error:", err);
      } finally {
        setIsLoading(false);
      }
    } else {
        // Handle case where user cancels file selection
        setSelectedFileName('');
        setBase64Image(null);
        setError('');
    }
  };
  // --- END MODIFICATION ---

  // --- MODIFIED: Send Base64 string instead of FormData ---
  const handleUpload = async () => {
    if (!base64Image) {
      setError("Please select and process an image first.");
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      // Use the new API function to send the string
      const response = await saveReceiptString(saleId, base64Image);
      toast.success(response.message || 'Receipt uploaded successfully!');
      if (onUploadSuccess) {
        onUploadSuccess(response.sale); // Pass the updated sale object back
      }
      handleClose(); // Close modal on success
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to upload receipt.';
      setError(errMsg);
      toast.error(errMsg);
      console.error("Upload failed:", err);
    } finally {
      setIsLoading(false);
    }
  };
  // --- END MODIFICATION ---

  // Reset state when closing
  const handleClose = () => {
    if (isLoading) return; // Prevent closing while an operation is in progress
    onClose();
    // Use a timeout to reset state after the modal transition finishes
    setTimeout(() => {
        setBase64Image(null);
        setSelectedFileName('');
        setError('');
    }, 300); // Adjust timeout based on modal transition duration
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Customer Receipt</DialogTitle>
      <DialogContent>
        {/* --- MODIFIED: Use Button for input like ProductForm --- */}
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Button
            variant="outlined"
            component="label" // Makes the button act like a file input label
            startIcon={<UploadFileIcon />}
            disabled={isLoading}
            fullWidth // Make button take full width
          >
            Select Image (JPG, PNG only)
            <input
              type="file"
              hidden // Hide the default ugly file input
              accept="image/jpeg,image/png" // Only allow jpg/png
              onChange={handleFileSelect}
            />
          </Button>

          {/* Show loading indicator during image processing */}
          {isLoading && !base64Image && (
             <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2 }}>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                <Typography variant="body2">Processing image...</Typography>
             </Box>
          )}

          {/* Show selected file name when ready */}
          {selectedFileName && !isLoading && base64Image && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2, color: 'success.main' }}>
              <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                {selectedFileName} (Ready)
              </Typography>
            </Box>
          )}

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </Box>
        {/* --- END MODIFICATION --- */}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>Cancel</Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          // --- MODIFIED: Disable if no base64Image is ready ---
          disabled={!base64Image || isLoading}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Upload & Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadReceiptModal;