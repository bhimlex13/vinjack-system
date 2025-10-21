// client/src/components/ImageViewModal.js
import React from 'react';
import { Dialog, DialogContent, IconButton, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const ImageViewModal = ({ open, onClose, imageUrl }) => {
  if (!imageUrl) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg">
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: (theme) => theme.palette.grey[500],
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
          },
          zIndex: 1 // Ensure it's above the image
        }}
      >
        <CloseIcon />
      </IconButton>
      <DialogContent sx={{ p: 0, overflow: 'hidden' }}> {/* Remove padding and hide overflow */}
        <Box
          component="img"
          src={imageUrl}
          alt="Receipt"
          sx={{
            display: 'block', // Prevent extra space below image
            width: '100%',    // Make image responsive
            maxHeight: '85vh', // Limit height
            objectFit: 'contain' // Ensure whole image is visible
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewModal;