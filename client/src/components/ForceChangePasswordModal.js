// client/src/components/ForceChangePasswordModal.js
import React, { useState, useContext } from 'react';
import { forceChangePassword } from '../api/userApi';
import AuthContext from '../context/AuthContext';

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Button, TextField, Box, Alert, CircularProgress
} from '@mui/material';

const ForceChangePasswordModal = () => {
  const { passwordChangeCompleted } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await forceChangePassword(formData);
      setMessage(response.data.message);
      // Wait a moment before closing the modal and unlocking the app
      setTimeout(() => {
        passwordChangeCompleted(); // Notify context that the change is done
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} disableEscapeKeyDown fullWidth maxWidth="xs">
      <DialogTitle>Change Your Password</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          As this is your first time logging in, you must change your temporary password.
        </DialogContentText>
        <Box component="form" id="force-change-password-form" onSubmit={handleSubmit}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

          <TextField
            required
            autoFocus
            margin="dense"
            name="newPassword"
            label="New Password"
            type="password"
            fullWidth
            variant="outlined"
            value={formData.newPassword}
            onChange={handleChange}
            disabled={!!message}
          />
          <TextField
            required
            margin="dense"
            name="confirmPassword"
            label="Confirm New Password"
            type="password"
            fullWidth
            variant="outlined"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={!!message}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px' }}>
        <Button
          type="submit"
          form="force-change-password-form"
          variant="contained"
          fullWidth
          disabled={isLoading || !!message}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Set New Password'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ForceChangePasswordModal;