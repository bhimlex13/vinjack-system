// client/src/components/ConfirmationModal.js
import React from 'react';

// MUI Imports
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';

const ConfirmationModal = ({ isOpen, message, onConfirm, onCancel, title = "Confirm Action" }) => {
  if (!isOpen) {
    return null;
  }

  // --- THIS IS THE FIX ---
  // Check if 'message' is an object with our specific keys, or just a string.
  const isMessageObject = typeof message === 'object' && message !== null && message.description;

  const dialogTitle = isMessageObject ? message.title : title;
  const dialogDescription = isMessageObject ? message.description : message;
  // --- END FIX ---

  return (
    <Dialog
      open={isOpen}
      onClose={onCancel}
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
    >
      <DialogTitle id="confirmation-dialog-title">
        {dialogTitle} {/* <-- Use the new variable */}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="confirmation-dialog-description">
          {dialogDescription} {/* <-- Use the new variable */}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="primary" autoFocus>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationModal;