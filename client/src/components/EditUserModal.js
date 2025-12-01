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
  const [formData, setFormData] = useState({
    fullName: user.fullName || '',
    username: user.username || '',
    email: user.email || '',
    role: user.role || 'Salesperson',
    status: user.status || 'active'
  });

  const [errors, setErrors] = useState({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); 

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

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
      newErrors.email = "Invalid email format.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const initiateUpdate = () => {
    if (!validateForm()) return; 
    setPendingAction('UPDATE_INFO');
    setIsConfirmOpen(true);
  };

  const initiatePasswordReset = () => {
    setPendingAction('RESET_PASSWORD');
    setIsConfirmOpen(true);
  };

  const handleUpdateInfo = async (adminPassword) => {
    try {
      await api.put(`/users/${user._id}`, { 
        ...formData,
        adminPassword 
      });
      toast.success("User updated successfully.");
      onUserUpdate(); 
      onClose(); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user.');
    }
  };

  const handleResetPassword = async (adminPassword) => {
    try {
      const response = await adminResetPassword(user._id, adminPassword);
      onPasswordResetSuccess(response); 
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password reset failed.');
    }
  };

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

      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit User: {user.fullName}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, fontSize: '0.9rem' }}>
            Update user details. <strong>Administrator password required to save.</strong>
          </DialogContentText>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              name="fullName"
              label="Full Name"
              fullWidth
              variant="outlined"
              size="small"
              value={formData.fullName}
              onChange={handleChange}
              error={!!errors.fullName}
              helperText={errors.fullName}
            />
            <TextField
              name="username"
              label="Username"
              fullWidth
              variant="outlined"
              size="small"
              value={formData.username}
              onChange={handleChange}
              error={!!errors.username}
              helperText={errors.username}
            />
            <TextField
              name="email"
              label="Email Address"
              fullWidth
              variant="outlined"
              size="small"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
            />

            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select
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

            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={formData.status}
                label="Status"
                onChange={handleChange}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
            
            <Divider sx={{ my: 1 }} />
            
            <Button
              variant="outlined"
              color="error"
              onClick={initiatePasswordReset}
              fullWidth
            >
              Reset User's Password
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={initiateUpdate}>Save Changes</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EditUserModal;