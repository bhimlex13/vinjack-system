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
// --- NEW: Import grey color ---
import { grey } from '@mui/material/colors';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const WarningModal = () => {
  const { warning, hideWarning } = useWarning();

  if (!warning) {
    return null;
  }

  // --- MODIFIED: Logic to determine color and icon ---
  let titleColor = 'warning.main'; // Default to 'Low' (orange)
  let TitleIcon = WarningAmberIcon;

  if (warning.type === 'OUT_OF_STOCK') {
    titleColor = grey[700]; // Dark Grey
    TitleIcon = ErrorOutlineIcon;
  } else if (warning.type === 'CRITICAL_STOCK') {
    titleColor = 'error.main'; // Red
    TitleIcon = ErrorOutlineIcon;
  }
  // --- END MODIFICATION ---

  return (
    <Dialog open={true} onClose={hideWarning} maxWidth="xs">
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          color: 'white',
          // --- MODIFIED: Use the new titleColor variable ---
          backgroundColor: titleColor,
        }}
      >
        {/* --- MODIFIED: Use the new TitleIcon variable --- */}
        <TitleIcon sx={{ mr: 1 }} />
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