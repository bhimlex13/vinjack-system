// client/src/components/UploadReceiptModal.js
import React, { useState } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';

import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  CircularProgress, Alert, Box, Typography // Added Typography
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const UploadReceiptModal = ({ open, onClose, saleId, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setError(''); // Clear previous errors
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    // Basic file type check (redundant with middleware but good UX)
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Please upload JPG, PNG, or PDF.');
      return;
    }

    // Basic file size check (redundant with middleware but good UX)
    if (selectedFile.size > 5000000) { // 5MB
        setError('File size exceeds 5MB limit.');
        return;
    }


    setIsLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('receiptImage', selectedFile); // Must match the name in uploadMiddleware

    try {
      const response = await api.post(`/sales/${saleId}/upload-receipt`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Receipt uploaded successfully!');
      if (onUploadSuccess) {
        onUploadSuccess(response.data.filePath); // Pass the new file path back if needed
      }
      handleClose(); // Close modal on success

    } catch (err) {
      console.error("Upload failed:", err);
      setError(err.response?.data?.message || 'Failed to upload receipt. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset state when closing
  const handleClose = () => {
    setSelectedFile(null);
    setIsLoading(false);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Customer Receipt</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <TextField
            fullWidth
            type="file"
            onChange={handleFileChange}
            variant="outlined"
            size="small"
            InputProps={{
              inputProps: {
                accept: 'image/jpeg, image/png, application/pdf', // Match middleware
              },
            }}
          />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {selectedFile && <Typography sx={{mt: 1}} variant="caption">Selected: {selectedFile.name}</Typography>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>Cancel</Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <UploadFileIcon />}
          disabled={!selectedFile || isLoading}
        >
          {isLoading ? 'Uploading...' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadReceiptModal;