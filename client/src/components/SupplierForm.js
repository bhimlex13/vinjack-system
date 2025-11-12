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
  DialogActions,
  FormControl, // <-- NEW
  InputLabel,  // <-- NEW
  Select,      // <-- NEW
  MenuItem     // <-- NEW
} from '@mui/material';

const SupplierForm = ({ onFormSubmit, supplierToEdit, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactPerson: '',
    contactNumber: '',
    address: '',
    paymentTerms: 'Cash', // <-- NEW
    status: 'Pending'     // <-- NEW
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (supplierToEdit) {
      setFormData({
        name: supplierToEdit.name || '',
        email: supplierToEdit.email || '',
        contactPerson: supplierToEdit.contactPerson || '',
        contactNumber: supplierToEdit.contactNumber || '',
        address: supplierToEdit.address || '',
        paymentTerms: supplierToEdit.paymentTerms || 'Cash', // <-- NEW
        status: supplierToEdit.status || 'Pending'           // <-- NEW
      });
    } else {
      // Reset form, including new fields
      setFormData({ 
        name: '', 
        email: '', 
        contactPerson: '', 
        contactNumber: '', 
        address: '', 
        paymentTerms: 'Cash', 
        status: 'Pending' 
      });
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
          name="email"
          label="Email Address"
          type="email"
          fullWidth
          variant="outlined"
          value={formData.email}
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

        {/* --- NEW FIELDS ADDED --- */}
        <FormControl fullWidth margin="dense">
          <InputLabel id="paymentTerms-select-label">Payment Terms</InputLabel>
          <Select
            labelId="paymentTerms-select-label"
            id="paymentTerms"
            name="paymentTerms"
            value={formData.paymentTerms}
            label="Payment Terms"
            onChange={handleChange}
          >
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="Consignment">Consignment</MenuItem>
            <MenuItem value="Terms">Terms</MenuItem>
          </Select>
        </FormControl>

        {/* Status field is only shown when EDITING a supplier (for the approval workflow) */}
        {supplierToEdit && (
          <FormControl fullWidth margin="dense">
            <InputLabel id="status-select-label">Status</InputLabel>
            <Select
              labelId="status-select-label"
              id="status"
              name="status"
              value={formData.status}
              label="Status"
              onChange={handleChange}
            >
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Approved">Approved</MenuItem>
              <MenuItem value="Rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
        )}
        {/* --- END NEW FIELDS --- */}

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