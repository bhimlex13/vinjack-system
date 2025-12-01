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
    setPassword(''); // Reset password field
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Security Verification</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2, fontSize: '0.9rem' }}>
          To proceed with this administrative action, please confirm your identity by entering your password.
        </DialogContentText>
        <Box component="form" onSubmit={(e) => { e.preventDefault(); handleConfirm(); }}>
          <TextField
            autoFocus
            required
            margin="dense"
            label="Your Password"
            type="password"
            fullWidth
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          color="primary"
          disabled={!password}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminConfirmPasswordModal;