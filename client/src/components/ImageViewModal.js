// client/src/components/ImageViewModal.js
import React from 'react';
import { Dialog, DialogContent, IconButton, Box, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

const ImageViewModal = ({ open, onClose, imageUrl }) => {
  if (!imageUrl) return null;

  // The isPDF check has been removed as PDFs are now handled by window.open() in the parent component.
  // This modal is strictly for image viewing now.
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
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
          zIndex: 1
        }}
      >
        <CloseIcon />
      </IconButton>
      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>

        {/* --- Image Renderer Only --- */}
        <Box
          component="img"
          src={imageUrl}
          alt="Document Preview"
          sx={{
            display: 'block',
            width: '100%', 
            maxHeight: '85vh', 
            objectFit: 'contain' 
          }}
        />

      </DialogContent>
    </Dialog>
  );
};

export default ImageViewModal;