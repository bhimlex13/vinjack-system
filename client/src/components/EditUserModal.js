// client/src/components/EditUserModal.js
import React, { useState, useContext } from 'react';
import api from '../api/axios';
import ConfirmationContext from '../context/ConfirmationContext';

import {
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Button, FormControl, InputLabel, Select, MenuItem, Stack, Box
} from '@mui/material';

const EditUserModal = ({ user, open, onClose, onUserUpdate }) => {
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);
  const { confirm } = useContext(ConfirmationContext);

  const handleUpdate = async () => {
    const isConfirmed = await confirm('Are you sure you want to save these changes?');
    if (isConfirmed) {
      try {
        await api.put(`/users/${user._id}`, { role, status });
        onUserUpdate();
        onClose();
      } catch (error) {
        // You can add a snackbar or alert here for better UX
        console.error('Failed to update user.', error);
        alert('Failed to update user.');
      }
    }
  };

  const handleDelete = async () => {
    const isConfirmed = await confirm(`DELETE USER: ${user.fullName}. This action is permanent and cannot be undone.`);
    if (isConfirmed) {
      try {
        await api.delete(`/users/${user._id}`);
        onUserUpdate(); // Refreshes the user list
        onClose();
      } catch (error) {
        console.error('Failed to delete user.', error);
        alert('Failed to delete user.');
      }
    }
  };
  
  return (
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
              id="role-select"
              value={role}
              label="Role"
              onChange={(e) => setRole(e.target.value)}
            >
              <MenuItem value="Mechanic">Mechanic</MenuItem>
              <MenuItem value="Clerk">Clerk</MenuItem>
              <MenuItem value="Owner">Owner</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel id="status-select-label">Account Status</InputLabel>
            <Select
              labelId="status-select-label"
              id="status-select"
              value={status}
              label="Account Status"
              onChange={(e) => setStatus(e.target.value)}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Archived (Inactive)</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px', justifyContent: 'space-between' }}>
        <Button color="error" onClick={handleDelete}>Delete User</Button>
        <Box>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdate}>Save Changes</Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default EditUserModal;