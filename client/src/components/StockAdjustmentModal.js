// client/src/components/StockAdjustmentModal.js
import React, { useState } from 'react';
import { createStockAdjustment } from '../api/adjustmentApi';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  ToggleButtonGroup, ToggleButton, Box, Typography, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

import LoadingSpinner from './LoadingSpinner';

const StockAdjustmentModal = ({ product, onClose, onSuccess }) => {
  const [adjustmentType, setAdjustmentType] = useState('decrease');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTypeChange = (event, newType) => {
    if (newType !== null) {
      setAdjustmentType(newType);
    }
  };

  const handleSubmit = async () => {
    if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
      setError('Please enter a valid, positive quantity.');
      return;
    }
    if (!reason.trim()) {
      setError('A reason for the adjustment is required.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await createStockAdjustment({
        productId: product._id,
        adjustmentType,
        quantity: Number(quantity),
        reason
      });
      toast.success(`Stock for ${product.name} adjusted successfully!`);
      onSuccess();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'An unexpected error occurred.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={true} 
      onClose={onClose} 
      fullWidth 
      maxWidth="sm"
      PaperComponent={motion.div}
      PaperProps={{
        initial: { y: 50, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: 50, opacity: 0 },
        transition: { duration: 0.3 },
        // --- FIX: Added sx to restore background ---
        sx: { 
          overflow: 'hidden',
          backgroundColor: 'background.paper', 
          boxShadow: 24,
          borderRadius: 2
        } 
      }}
    >
      <DialogTitle>
        Adjust Stock for: <Typography component="span" variant="h6" color="primary">{product.name}</Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Typography>Current Stock: <strong>{product.quantity}</strong></Typography>
          
          <ToggleButtonGroup
            color="primary"
            value={adjustmentType}
            exclusive
            onChange={handleTypeChange}
            fullWidth
          >
            <ToggleButton value="decrease" sx={{ flex: 1 }}><RemoveIcon sx={{ mr: 1 }}/> Decrease Stock</ToggleButton>
            <ToggleButton value="increase" sx={{ flex: 1 }}><AddIcon sx={{ mr: 1 }}/> Increase Stock</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            autoFocus
            label="Quantity to Adjust"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            InputProps={{ inputProps: { min: 1 } }}
            fullWidth
          />

          <TextField
            label="Reason for Adjustment"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            rows={3}
            fullWidth
            placeholder="e.g., Damaged goods, Inventory count correction, etc."
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading} startIcon={loading ? null : (adjustmentType === 'increase' ? <AddIcon /> : <RemoveIcon />)}>
          {loading ? <LoadingSpinner text="" /> : 'Submit Adjustment'} 
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StockAdjustmentModal;