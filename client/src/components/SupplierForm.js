// client/src/components/SupplierForm.js

import React, { useState, useEffect } from 'react';
import api from '../api/axios';

// MUI Imports
import {
  Box,
  Button,
  TextField,
  Alert,
  DialogContent,
  DialogActions
} from '@mui/material';

const SupplierForm = ({ onFormSubmit, supplierToEdit, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    contactNumber: '',
    address: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (supplierToEdit) {
      setFormData({
        name: supplierToEdit.name || '',
        contactPerson: supplierToEdit.contactPerson || '',
        contactNumber: supplierToEdit.contactNumber || '',
        address: supplierToEdit.address || ''
      });
    } else {
      setFormData({ name: '', contactPerson: '', contactNumber: '', address: '' });
    }
  }, [supplierToEdit]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = supplierToEdit
        ? await api.put(`/suppliers/${supplierToEdit._id}`, formData)
        : await api.post('/suppliers', formData);
      
      onFormSubmit(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred.');
    }
  };

  // This component now returns DialogContent and DialogActions
  // to be used within a parent Dialog component.
  return (
    <Box component="form" onSubmit={handleSubmit}>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          autoFocus
          required
          margin="dense"
          name="name"
          label="Supplier Name"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.name}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          name="contactPerson"
          label="Contact Person"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.contactPerson}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          name="contactNumber"
          label="Contact Number"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.contactNumber}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          name="address"
          label="Address"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.address}
          onChange={handleChange}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained">
          {supplierToEdit ? 'Update Supplier' : 'Add Supplier'}
        </Button>
      </DialogActions>
    </Box>
  );
};

export default SupplierForm;