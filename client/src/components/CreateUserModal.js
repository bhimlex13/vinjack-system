// client/src/components/CreateUserModal.js
import React, { useState } from 'react';
import { createUser } from '../api/userApi';
import AdminConfirmPasswordModal from './AdminConfirmPasswordModal';

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, InputLabel, Select, MenuItem,
  Alert, CircularProgress, Box, Stack
} from '@mui/material';

const CreateUserModal = ({ onClose, onUserCreated }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '', 
    email: '',
    role: 'Salesperson', 
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) return "Full Name is required.";
    if (!formData.username.trim()) return "Username is required.";
    if (formData.username.length < 3) return "Username must be at least 3 characters long.";
    if (!formData.email.trim()) return "Email Address is required.";

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(formData.email)) return "Please enter a valid email address.";

    return null;
  };

  const handleInitiateCreate = (e) => {
    e.preventDefault();
    setError('');
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleConfirmCreate = async (adminPassword) => {
    setIsLoading(true);
    try {
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

      <Dialog open={true} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Create New User</DialogTitle>
        <DialogContent>
          <Box component="form" id="create-user-form" onSubmit={handleInitiateCreate} sx={{ mt: 1 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            <Stack spacing={2}>
                <TextField
                autoFocus
                required
                name="fullName"
                label="Full Name"
                fullWidth
                variant="outlined"
                size="small"
                value={formData.fullName}
                onChange={handleChange}
                />

                <TextField
                required
                name="username"
                label="Username"
                fullWidth
                variant="outlined"
                size="small"
                value={formData.username}
                onChange={handleChange}
                />
                
                <TextField
                required
                name="email"
                label="Email Address"
                type="email"
                fullWidth
                variant="outlined"
                size="small"
                value={formData.email}
                onChange={handleChange}
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
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} color="inherit">Cancel</Button>
          <Button 
            type="submit" 
            form="create-user-form" 
            variant="contained" 
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CreateUserModal;