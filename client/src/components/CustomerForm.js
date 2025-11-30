// client/src/components/CustomerForm.js
import React, { useState, useEffect } from 'react';
import { createCustomer, updateCustomer } from '../api/customerApi';
import { isEmail } from 'validator';

// MUI Imports
import { Box, TextField, Button, Stack, Alert, DialogContent, DialogActions } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';

const CustomerForm = ({ onFormSubmit, customerToEdit, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (customerToEdit) {
      setFormData({
        name: customerToEdit.name || '',
        email: customerToEdit.email || '',
        phone: customerToEdit.phone || '',
        address: customerToEdit.address || '',
      });
    } else {
      setFormData({ name: '', email: '', phone: '', address: '' });
    }
  }, [customerToEdit]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error when user types
    if (error) setError('');
  };

  const validate = () => {
    if (!formData.name.trim()) {
      setError('Customer Name is required.');
      return false;
    }
    
    if (formData.email && !isEmail(formData.email)) {
      setError('Please enter a valid email address.');
      return false;
    }

    // Basic regex for digits/spaces/dashes/plus, min 7 chars
    if (formData.phone && !/^[0-9+\- ]{7,15}$/.test(formData.phone)) {
       setError('Please enter a valid phone number.');
       return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);
    
    try {
      if (customerToEdit) {
        await updateCustomer(customerToEdit._id, formData);
      } else {
        await createCustomer(formData);
      }
      onFormSubmit();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DialogContent dividers>
        <Box component="form" id="customer-form" onSubmit={handleSubmit}>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
          <Stack spacing={2.5}>
            <TextField
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              fullWidth
              variant="outlined"
              size="small"
              placeholder="e.g. Juan Dela Cruz"
            />
            <TextField
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              size="small"
              placeholder="e.g. juan@example.com"
            />
            <TextField
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              size="small"
              placeholder="e.g. 0917 123 4567"
            />
            <TextField
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              size="small"
              placeholder="Optional address details..."
            />
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting} color="inherit">Cancel</Button>
        <Button 
            type="submit" 
            form="customer-form" 
            variant="contained" 
            disabled={isSubmitting}
            startIcon={!isSubmitting && <SaveIcon />}
        >
          {isSubmitting ? 'Saving...' : 'Save Customer'}
        </Button>
      </DialogActions>
    </>
  );
};

export default CustomerForm;