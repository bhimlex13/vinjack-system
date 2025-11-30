// client/src/components/CreateUserModal.js
import React, { useState } from 'react';
import { createUser } from '../api/userApi';
import AdminConfirmPasswordModal from './AdminConfirmPasswordModal';

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, InputLabel, Select, MenuItem,
  Alert, CircularProgress, Box
} from '@mui/material';

const CreateUserModal = ({ onClose, onUserCreated }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '', // Added username
    email: '',
    role: 'Salesperson', 
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error when user types
    if (error) setError('');
  };

  // Validation Logic
  const validateForm = () => {
    if (!formData.fullName.trim()) {
      return "Full Name is required.";
    }
    if (!formData.username.trim()) {
      return "Username is required.";
    }
    if (formData.username.length < 3) {
      return "Username must be at least 3 characters long.";
    }
    if (!formData.email.trim()) {
      return "Email Address is required.";
    }

    // Strict Email Regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(formData.email)) {
      return "Please enter a valid email address (e.g., user@example.com).";
    }

    return null;
  };

  const handleInitiateCreate = (e) => {
    e.preventDefault();
    setError('');

    // Run Validation
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Open password confirmation modal if valid
    setIsConfirmOpen(true);
  };

  const handleConfirmCreate = async (adminPassword) => {
    setIsLoading(true);
    try {
      // Include the adminPassword in the request
      const response = await createUser({ ...formData, adminPassword });
      
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
    <>
      <AdminConfirmPasswordModal 
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmCreate}
      />

      <Dialog open={true} onClose={onClose} fullWidth maxWidth="xs">
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Box component="form" id="create-user-form" onSubmit={handleInitiateCreate} sx={{ mt: 2 }}>
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
              id="username"
              name="username"
              label="Username"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.username}
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
              error={!!error && error.includes('email')}
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
                <MenuItem value="Super Admin">Super Admin</MenuItem>
                <MenuItem value="Admin">Admin</MenuItem>
                <MenuItem value="Salesperson">Salesperson</MenuItem>
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
    </>
  );
};

export default CreateUserModal;