// client/src/components/EditPurchaseOrderModal.js
import React, { useState, useEffect } from 'react';
import { getProductsBySupplier } from '../api/productApi'; // Assuming you have this API function
import { updatePurchaseOrder } from '../api/purchaseOrderApi';
import { toast } from 'react-toastify';

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, TextField, Button,
  Grid, Autocomplete, IconButton, Typography, Divider, Alert, CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const EditPurchaseOrderModal = ({ open, onClose, poData, onSuccess }) => {
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isLoadingProducts, setIsLoadingProducts] = useState(false); // State for product loading

  useEffect(() => {
    if (poData) {
      const initialItems = poData.items.map(item => ({
        product: item.product, 
        quantity: item.quantity,
        cost: item.cost,
      }));
      setItems(initialItems);
      setNotes(poData.notes || '');
      setReason('');
      setError('');
    }
  }, [poData]);

  // --- THIS ENTIRE useEffect BLOCK IS UPDATED ---
  useEffect(() => {
    // Fetch products specifically for the selected supplier
    const fetchProductsForSupplier = async () => {
      if (!poData?.supplier?._id) return; // Don't fetch if there's no supplier
      
      setIsLoadingProducts(true);
      setError('');
      try {
        // Use the new API endpoint
        const response = await getProductsBySupplier(poData.supplier._id);
        setProducts(response);
      } catch (err) {
        console.error("Failed to fetch products for supplier", err);
        setError(`Could not load product list for ${poData.supplier.name}.`);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    if (open) {
      fetchProductsForSupplier();
    }
  }, [open, poData?.supplier?._id]); // Re-run if modal opens or supplier ID changes

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    if (field === 'product') {
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
      onSuccess(updatedPO);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update Purchase Order.');
    }
  };

  // --- Helper API function (add this to your productApi.js file) ---
  // You will need to create a file like `client/src/api/productApi.js`
  // and add this function there, then import it at the top of this file.
  /*
  // In client/src/api/productApi.js
  import api from './axios';
  
  export const getProductsBySupplier = async (supplierId) => {
    const { data } = await api.get(`/products/by-supplier/${supplierId}`);
    return data;
  };
  */

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Edit Purchase Order #{poData?.poNumber}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" noValidate autoComplete="off" sx={{ mt: 2 }}>
          {items.map((item, index) => (
            <Grid container spacing={2} key={index} alignItems="center" sx={{ mb: 2 }}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={products}
                  getOptionLabel={(option) => option.name || ''}
                  value={item.product}
                  isOptionEqualToValue={(option, value) => option._id === value?._id}
                  onChange={(e, newValue) => handleItemChange(index, 'product', newValue)}
                  loading={isLoadingProducts}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Product" 
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {isLoadingProducts ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={5} md={2}>
                <TextField type="number" label="Quantity" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} fullWidth inputProps={{ min: 1 }} />
              </Grid>
              <Grid item xs={5} md={3}>
                <TextField type="number" label="Unit Cost" value={item.cost} onChange={(e) => handleItemChange(index, 'cost', e.target.value)} fullWidth inputProps={{ step: "0.01", min: 0 }}/>
              </Grid>
              <Grid item xs={2} md={1} sx={{ textAlign: 'center' }}>
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