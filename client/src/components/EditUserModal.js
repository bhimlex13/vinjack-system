// client/src/components/EditUserModal.js
import React, { useState, useContext } from 'react';
import api from '../api/axios';
import ConfirmationContext from '../context/ConfirmationContext';
import AdminConfirmPasswordModal from './AdminConfirmPasswordModal';
import { adminResetPassword } from '../api/userApi';
import { toast } from 'react-toastify';

import {
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Button, FormControl, InputLabel, Select, MenuItem, Stack, Box, Divider
} from '@mui/material';

const EditUserModal = ({ user, open, onClose, onUserUpdate, onPasswordResetSuccess }) => { 
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { confirm } = useContext(ConfirmationContext);

  const handleUpdate = async () => {
    // --- UPDATED: Confirmation text ---
    const isConfirmed = await confirm({
        title: 'Confirm Update',
        description: `Are you sure you want to update ${user.fullName}'s role to '${role}' and status to '${status}'?`
    });
    // --- END UPDATE ---
    
    if (isConfirmed) {
      try {
        await api.put(`/users/${user._id}`, { role, status });
        toast.success("User updated successfully.");
        onUserUpdate(); // Refreshes the user list
        onClose(); // Closes this modal
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to update user.');
        console.error('Failed to update user.', error);
      }
    }
  };

  const handleResetPasswordConfirm = async (adminPassword) => {
    try {
      const response = await adminResetPassword(user._id, adminPassword);
      onPasswordResetSuccess(response); // Pass new credentials up
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
                {/* --- UPDATED: New roles --- */}
                <MenuItem value="Admin">Admin</MenuItem>
                <MenuItem value="Salesperson">Salesperson</MenuItem>
                {/* You cannot change a user to Super Admin here */}
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
                <MenuItem value="inactive">Inactive</MenuItem> {/* <-- UPDATED text */}
              </Select>
            </FormControl>
            <Divider />
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