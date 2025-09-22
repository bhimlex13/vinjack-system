// client/src/components/EditUserModal.js
import React, { useState, useContext } from 'react';
import api from '../api/axios';
import ConfirmationContext from '../context/ConfirmationContext';
import AdminConfirmPasswordModal from './AdminConfirmPasswordModal'; // 1. Import new components
import { adminResetPassword } from '../api/userApi';
import { toast } from 'react-toastify';

import {
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Button, FormControl, InputLabel, Select, MenuItem, Stack, Box, Divider
} from '@mui/material';

// 2. Add 'onPasswordResetSuccess' prop
const EditUserModal = ({ user, open, onClose, onUserUpdate, onPasswordResetSuccess }) => { 
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false); // 3. State for confirm modal
  const { confirm } = useContext(ConfirmationContext);

  const handleUpdate = async () => {
    const isConfirmed = await confirm('Are you sure you want to save these changes?');
    if (isConfirmed) {
      try {
        await api.put(`/users/${user._id}`, { role, status });
        toast.success("User updated successfully.");
        onUserUpdate();
        onClose();
      } catch (error) {
        toast.error('Failed to update user.');
        console.error('Failed to update user.', error);
      }
    }
  };

  // 4. New handler for the reset password flow
  const handleResetPasswordConfirm = async (adminPassword) => {
    try {
      const response = await adminResetPassword(user._id, adminPassword);
      onPasswordResetSuccess(response); // Pass new credentials up to the parent
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password reset failed.');
    }
  };

  return (
    <>
      <AdminConfirmPasswordModal
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleResetPasswordConfirm}
      />

      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
        <DialogTitle>Editing: {user.fullName}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Modify the user's role and account status.
          </DialogContentText>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="role-select-label">Role</InputLabel>
              <Select
                labelId="role-select-label"
                value={role}
                label="Role"
                onChange={(e) => setRole(e.target.value)}
              >
                <MenuItem value="Mechanic">Mechanic</MenuItem>
                <MenuItem value="Clerk">Clerk</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="status-select-label">Account Status</InputLabel>
              <Select
                labelId="status-select-label"
                value={status}
                label="Account Status"
                onChange={(e) => setStatus(e.target.value)}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Archived (Inactive)</MenuItem>
              </Select>
            </FormControl>
            <Divider />
            {/* 5. Add the "Reset Password" button */}
            <Button
              variant="outlined"
              color="warning"
              onClick={() => setIsConfirmOpen(true)}
            >
              Reset User's Password
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: '16px 24px' }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdate}>Save Changes</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EditUserModal;