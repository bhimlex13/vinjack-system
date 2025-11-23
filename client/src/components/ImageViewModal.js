// client/src/components/ImageViewModal.js
import React from 'react';
import { Dialog, DialogContent, IconButton, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { motion, AnimatePresence } from 'framer-motion'; // --- NEW IMPORT ---

const ImageViewModal = ({ open, onClose, imageUrl }) => {
  if (!imageUrl) return null;

  return (
    <AnimatePresence>
        {open && (
            <Dialog 
                open={open} 
                onClose={onClose} 
                maxWidth="md" 
                fullWidth
                // --- ANIMATED PAPER ---
                PaperComponent={motion.div}
                PaperProps={{
                    initial: { scale: 0.8, opacity: 0 },
                    animate: { scale: 1, opacity: 1 },
                    exit: { scale: 0.8, opacity: 0 },
                    transition: { duration: 0.3 },
                    sx: { // Restore Dialog styling
                        backgroundColor: 'background.paper',
                        boxShadow: 24,
                        borderRadius: 2,
                        overflow: 'hidden',
                        m: 2
                    }
                }}
            >
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

                {/* --- Image Renderer --- */}
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
        )}
    </AnimatePresence>
  );
};

export default ImageViewModal;