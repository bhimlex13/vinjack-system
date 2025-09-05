// client/src/components/CreateUserModal.js
import React, { useState } from 'react';
import { createUser } from '../api/userApi';

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, InputLabel, Select, MenuItem,
  Alert, CircularProgress, Box
} from '@mui/material';

const CreateUserModal = ({ onClose, onUserCreated }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'Clerk', // Default role
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await createUser(formData);
      // Pass the credentials up to the parent component to display
      onUserCreated({
        username: response.data.generatedUsername,
        password: response.data.temporaryPassword,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Create New User</DialogTitle>
      <DialogContent>
        <Box component="form" id="create-user-form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            autoFocus
            required
            margin="dense"
            id="fullName"
            name="fullName"
            label="Full Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.fullName}
            onChange={handleChange}
          />
          <TextField
            required
            margin="dense"
            id="email"
            name="email"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={formData.email}
            onChange={handleChange}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel id="role-select-label">Role</InputLabel>
            <Select
              labelId="role-select-label"
              id="role"
              name="role"
              value={formData.role}
              label="Role"
              onChange={handleChange}
            >
              <MenuItem value="Clerk">Clerk</MenuItem>
              <MenuItem value="Mechanic">Mechanic</MenuItem>
              {/* Owner role is not assignable here */}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          type="submit" 
          form="create-user-form" 
          variant="contained" 
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Create User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateUserModal;