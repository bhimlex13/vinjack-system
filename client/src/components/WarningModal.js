// client/src/components/WarningModal.js
import React from 'react';
import { useWarning } from '../context/WarningContext';

// MUI Imports
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const WarningModal = () => {
  const { warning, hideWarning } = useWarning();

  if (!warning) {
    return null;
  }

  const isOutOfStock = warning.type === 'OUT_OF_STOCK';

  return (
    <Dialog open={true} onClose={hideWarning} maxWidth="xs">
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          color: 'white',
          backgroundColor: isOutOfStock ? 'error.main' : 'warning.main',
        }}
      >
        {isOutOfStock ? (
          <ErrorOutlineIcon sx={{ mr: 1 }} />
        ) : (
          <WarningAmberIcon sx={{ mr: 1 }} />
        )}
        Stock Level Warning
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            component="img"
            src={
              warning.image ||
              'https://placehold.co/100x100/e2e8f0/e2e8f0?text=No+Image'
            }
            alt={warning.productName}
            sx={{
              width: 80,
              height: 80,
              objectFit: 'cover',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
            }}
          />
          <Typography>{warning.message}</Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={hideWarning} variant="contained">
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WarningModal;