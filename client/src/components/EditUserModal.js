// client/src/components/EditUserModal.js
import React, { useState } from 'react';
import api from '../api/axios';
import AdminConfirmPasswordModal from './AdminConfirmPasswordModal';
import { adminResetPassword } from '../api/userApi';
import { toast } from 'react-toastify';

import {
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Button, FormControl, InputLabel, Select, MenuItem, Stack, Divider, TextField
} from '@mui/material';

const EditUserModal = ({ user, open, onClose, onUserUpdate, onPasswordResetSuccess }) => { 
  // State for editable fields
  const [formData, setFormData] = useState({
    fullName: user.fullName || '',
    username: user.username || '',
    email: user.email || '',
    role: user.role || 'Salesperson',
    status: user.status || 'active'
  });

  // State for validation errors
  const [errors, setErrors] = useState({});
  
  // State for security modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'UPDATE_INFO' or 'RESET_PASSWORD'

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear specific field error when typing
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  // Validation Logic
  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!formData.fullName.trim()) newErrors.fullName = "Full Name is required.";
    
    if (!formData.username.trim()) {
      newErrors.username = "Username is required.";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Invalid email format (e.g., user@example.com).";
    }

    setErrors(newErrors);
    // Return true if no keys in newErrors
    return Object.keys(newErrors).length === 0;
  };

  // Triggered when "Save Changes" is clicked
  const initiateUpdate = () => {
    if (!validateForm()) {
      return; // Stop if validation fails
    }
    setPendingAction('UPDATE_INFO');
    setIsConfirmOpen(true);
  };

  // Triggered when "Reset User's Password" is clicked
  const initiatePasswordReset = () => {
    setPendingAction('RESET_PASSWORD');
    setIsConfirmOpen(true);
  };

  // Handlers for actual logic once password is verified
  const handleUpdateInfo = async (adminPassword) => {
    try {
      await api.put(`/users/${user._id}`, { 
        ...formData,
        adminPassword // Pass admin password to backend for verification
      });
      toast.success("User updated successfully.");
      onUserUpdate(); // Refreshes the user list
      onClose(); // Closes this modal
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user.');
      console.error('Failed to update user.', error);
    }
  };

  const handleResetPassword = async (adminPassword) => {
    try {
      const response = await adminResetPassword(user._id, adminPassword);
      onPasswordResetSuccess(response); // Pass new credentials up
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password reset failed.');
    }
  };

  // Central handler for the password confirmation modal
  const handleActionConfirm = (adminPassword) => {
    if (pendingAction === 'UPDATE_INFO') {
      handleUpdateInfo(adminPassword);
    } else if (pendingAction === 'RESET_PASSWORD') {
      handleResetPassword(adminPassword);
    }
    setPendingAction(null);
  };

  return (
    <>
      <AdminConfirmPasswordModal
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleActionConfirm}
      />

      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
        <DialogTitle>Editing: {user.fullName}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Update user information. <strong>Administrator password required to save changes.</strong>
          </DialogContentText>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              margin="dense"
              name="fullName"
              label="Full Name"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.fullName}
              onChange={handleChange}
              error={!!errors.fullName}
              helperText={errors.fullName}
            />
            <TextField
              margin="dense"
              name="username"
              label="Username"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.username}
              onChange={handleChange}
              error={!!errors.username}
              helperText={errors.username}
            />
            <TextField
              margin="dense"
              name="email"
              label="Email Address"
              type="email"
              fullWidth
              variant="outlined"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
            />

            <FormControl fullWidth>
              <InputLabel id="role-select-label">Role</InputLabel>
              <Select
                labelId="role-select-label"
                name="role"
                value={formData.role}
                label="Role"
                onChange={handleChange}
              >
                <MenuItem value="Super Admin">Super Admin</MenuItem>
                <MenuItem value="Admin">Admin</MenuItem>
                <MenuItem value="Salesperson">Salesperson</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="status-select-label">Account Status</InputLabel>
              <Select
                labelId="status-select-label"
                name="status"
                value={formData.status}
                label="Account Status"
                onChange={handleChange}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
            
            <Divider sx={{ my: 1 }} />
            
            <Button
              variant="outlined"
              color="warning"
              onClick={initiatePasswordReset}
            >
              Reset User's Password
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: '16px 24px' }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={initiateUpdate}>Save Changes</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EditUserModal;