// client/src/components/EditPurchaseOrderModal.js
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { updatePurchaseOrder } from '../api/purchaseOrderApi';
import { toast } from 'react-toastify';

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, TextField, Button,
  Grid, Autocomplete, IconButton, Typography, Divider, Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const EditPurchaseOrderModal = ({ open, onClose, poData, onSuccess }) => {
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // When the poData prop changes (i.e., when the modal opens), initialize the form state
    if (poData) {
      const initialItems = poData.items.map(item => ({
        // Ensure the product object is what Autocomplete expects
        product: item.product, 
        quantity: item.quantity,
        cost: item.cost,
      }));
      setItems(initialItems);
      setNotes(poData.notes || '');
      setReason(''); // Reset reason every time the modal opens
      setError('');
    }
  }, [poData]);

  useEffect(() => {
    // Fetch the full list of products to populate the dropdowns
    const fetchProducts = async () => {
      try {
        const response = await api.get('/products');
        setProducts(response.data);
      } catch (err) {
        console.error("Failed to fetch products", err);
        setError("Could not load product list.");
      }
    };
    if (open) {
      fetchProducts();
    }
  }, [open]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    if (field === 'product') {
      // When a new product is selected, update the cost to its default cost
      newItems[index] = { ...newItems[index], product: value, cost: value?.cost || 0 };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { product: null, quantity: 1, cost: 0 }]);
  };

  const handleRemoveItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('A reason for editing is required.');
      return;
    }
    if (items.some(item => !item.product || item.quantity <= 0 || item.cost < 0)) {
        setError('Please ensure all items have a product, a valid quantity, and a valid cost.');
        return;
    }
    setError('');

    const payload = {
      items: items.map(item => ({
        product: item.product._id,
        quantity: Number(item.quantity),
        unitCost: Number(item.cost),
      })),
      notes,
      reason,
    };

    try {
      const updatedPO = await updatePurchaseOrder(poData._id, payload);
      toast.success('Purchase Order updated successfully!');
      onSuccess(updatedPO); // Pass the updated data back to the parent page
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update Purchase Order.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Edit Purchase Order #{poData?.poNumber}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" noValidate autoComplete="off" sx={{ mt: 2 }}>
          {items.map((item, index) => (
            <Grid container spacing={2} key={index} alignItems="center" sx={{ mb: 2 }}>
              <Grid item size={{ xs: 12, md: 6 }}>
                <Autocomplete
                  options={products}
                  getOptionLabel={(option) => option.name || ''}
                  value={item.product}
                  isOptionEqualToValue={(option, value) => option._id === value?._id}
                  onChange={(e, newValue) => handleItemChange(index, 'product', newValue)}
                  renderInput={(params) => <TextField {...params} label="Product" />}
                />
              </Grid>
              <Grid item size={{ xs: 5, md: 2 }}>
                <TextField type="number" label="Quantity" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} fullWidth inputProps={{ min: 1 }} />
              </Grid>
              <Grid item size={{ xs: 5, md: 3 }}>
                <TextField type="number" label="Unit Cost" value={item.cost} onChange={(e) => handleItemChange(index, 'cost', e.target.value)} fullWidth inputProps={{ step: "0.01", min: 0 }}/>
              </Grid>
              <Grid item size={{ xs: 2, md: 1 }} sx={{ textAlign: 'center' }}>
                <IconButton onClick={() => handleRemoveItem(index)} color="error"><DeleteIcon /></IconButton>
              </Grid>
            </Grid>
          ))}
          <Button onClick={handleAddItem}>Add Item</Button>
          <Divider sx={{ my: 2 }} />
          <TextField label="Notes / Memos" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline rows={3} sx={{ mb: 2 }} />
          <TextField label="Reason for Editing" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth required />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save Changes</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditPurchaseOrderModal;