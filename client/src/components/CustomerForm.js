// client/src/components/CustomerForm.js
import React, { useState, useEffect } from 'react';
import { createCustomer, updateCustomer } from '../api/customerApi';
import { isEmail, isMobilePhone } from 'validator'; // Added validator

// MUI Imports
import { Box, TextField, Button, Stack, Alert } from '@mui/material';

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
  };

  // --- NEW: Comprehensive Validation Function ---
  const validate = () => {
    if (!formData.name.trim()) {
      setError('Customer Name is required.');
      return false;
    }
    
    if (formData.email && !isEmail(formData.email)) {
      setError('Please enter a valid email address.');
      return false;
    }

    // Basic validation for PH mobile numbers (09xxxxxxxxx) or landline
    // Using validator's isMobilePhone with 'en-PH' locale, strict mode false to allow other formats if needed
    // Or manual regex for flexibility: /^(09|\+639)\d{9}$/
    if (formData.phone && !/^[0-9+\- ]{7,15}$/.test(formData.phone)) {
       setError('Please enter a valid phone number (e.g., 09123456789).');
       return false;
    }

    setError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // --- NEW: Run Validation ---
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
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 3, pt: 1 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stack spacing={2}>
        <TextField
          label="Full Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          fullWidth
          error={error.includes('Name')}
        />
        <TextField
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          fullWidth
          error={error.includes('email')}
          helperText={error.includes('email') ? "Format: example@mail.com" : ""}
        />
        <TextField
          label="Phone Number"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          fullWidth
          error={error.includes('phone')}
          helperText={error.includes('phone') ? "Format: 09xxxxxxxxx" : ""}
        />
        <TextField
          label="Address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          fullWidth
          multiline
          rows={2}
        />
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Customer'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default CustomerForm;