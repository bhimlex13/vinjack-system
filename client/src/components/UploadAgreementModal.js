// client/src/components/UploadAgreementModal.js
import React, { useState } from 'react';
import { uploadSignedAgreement } from '../api/purchaseOrderApi';
import { toast } from 'react-toastify';

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  Typography, CircularProgress, Alert
} from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

const UploadAgreementModal = ({ open, onClose, poId, onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [base64String, setBase64String] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // --- UPDATED: Allow PDF ---
      if (!selectedFile.type.startsWith('image/') && selectedFile.type !== 'application/pdf') {
        setError('Invalid file type. Please upload an image (PNG, JPG) or PDF.');
        return;
      }
      // --- END UPDATED ---

      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB Limit
        setError('File is too large. Please upload a file under 5MB.');
        return;
      }

      setError('');
      setFile(selectedFile);
      
      // Create preview URL (works for images and PDF blobs)
      const previewUrl = URL.createObjectURL(selectedFile);
      setFilePreview(previewUrl);

      // Convert to Base64
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onloadend = () => {
        setBase64String(reader.result);
      };
      reader.onerror = (err) => {
        console.error("FileReader error:", err);
        setError("Failed to read file.");
      }
    }
  };

  const resetState = () => {
    setFile(null);
    setFilePreview(null);
    setBase64String('');
    setIsLoading(false);
    setError('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSubmit = async () => {
    if (!base64String) {
      setError('Please select a file to upload.');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const updatedPo = await uploadSignedAgreement(poId, base64String);
      onUploadSuccess(updatedPo); 
      resetState(); 
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to upload agreement.';
      setError(errMsg);
      toast.error(errMsg);
      setIsLoading(false);
    }
  };
  
  React.useEffect(() => {
    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Upload Signed Agreement</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Box sx={{ textAlign: 'center', my: 2 }}>
          <Button
            variant="outlined"
            component="label"
            startIcon={<FileUploadIcon />}
            disabled={isLoading}
          >
            {file ? 'Change File' : 'Select File (Image or PDF)'}
            <input
              type="file"
              hidden
              accept="image/*,application/pdf" // --- UPDATED ---
              onChange={handleFileChange}
            />
          </Button>
          {file && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Selected: <strong>{file.name}</strong>
            </Typography>
          )}
        </Box>

        {filePreview && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="subtitle2" gutterBottom>Preview:</Typography>
            
            {/* --- UPDATED: Handle PDF Preview differently --- */}
            {file && file.type === 'application/pdf' ? (
               <Box sx={{ p: 3, border: '1px solid #ddd', borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: '#f9f9f9' }}>
                  <PictureAsPdfIcon color="error" sx={{ fontSize: 60, mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    PDF Document Ready to Upload
                  </Typography>
               </Box>
            ) : (
              <img 
                src={filePreview} 
                alt="Agreement Preview" 
                style={{ maxWidth: '100%', maxHeight: '300px', border: '1px solid #ddd', borderRadius: '4px' }} 
              />
            )}
            {/* --- END UPDATED --- */}

          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit" disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!file || isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Upload and Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadAgreementModal;