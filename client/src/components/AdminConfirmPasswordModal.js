// client/src/components/AdminConfirmPasswordModal.js
import React, { useState } from 'react';

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Button, TextField, Box
} from '@mui/material';

const AdminConfirmPasswordModal = ({ open, onClose, onConfirm }) => {
  const [password, setPassword] = useState('');

  const handleConfirm = () => {
    onConfirm(password);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Confirm Your Identity</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          To proceed with this administrative action, please enter your own password.
        </DialogContentText>
        <Box component="form" onSubmit={(e) => { e.preventDefault(); handleConfirm(); }}>
          <TextField
            autoFocus
            required
            margin="dense"
            name="adminPassword"
            label="Your Password"
            type="password"
            fullWidth
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          color="warning"
          disabled={!password}
        >
          Confirm & Reset
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminConfirmPasswordModal;