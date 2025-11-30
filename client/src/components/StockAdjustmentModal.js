// client/src/components/StockAdjustmentModal.js
import React, { useState } from 'react';
import { createStockAdjustment } from '../api/adjustmentApi';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  ToggleButtonGroup, ToggleButton, Box, Typography, Alert, Grid
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
        sx: { 
          overflow: 'hidden',
          backgroundColor: 'background.paper', // Fixed background
          boxShadow: 24,
          borderRadius: 2
        } 
      }}
    >
      <DialogTitle sx={{ fontWeight: 'bold' }}>
        Adjust Stock: <Typography component="span" variant="h6" color="primary" fontWeight="bold">{product.name}</Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography gutterBottom>Current Stock: <strong>{product.quantity}</strong></Typography>
          
          <Grid container spacing={2}>
            {/* Standard Grid V2 Syntax */}
            <Grid item size={{ xs: 12 }}>
                <ToggleButtonGroup
                    color={adjustmentType === 'increase' ? 'success' : 'error'}
                    value={adjustmentType}
                    exclusive
                    onChange={handleTypeChange}
                    fullWidth
                    size="small"
                >
                    <ToggleButton value="decrease"><RemoveIcon sx={{ mr: 1 }}/> Decrease</ToggleButton>
                    <ToggleButton value="increase"><AddIcon sx={{ mr: 1 }}/> Increase</ToggleButton>
                </ToggleButtonGroup>
            </Grid>

            <Grid item size={{ xs: 12 }}>
                <TextField
                    autoFocus
                    label="Quantity to Adjust"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    InputProps={{ inputProps: { min: 1 } }}
                    fullWidth
                    variant="outlined"
                />
            </Grid>

            <Grid item size={{ xs: 12 }}>
                <TextField
                    label="Reason for Adjustment"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    multiline
                    rows={3}
                    fullWidth
                    placeholder="e.g., Damaged goods, Inventory count correction..."
                    variant="outlined"
                />
            </Grid>
          </Grid>

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading} color="inherit">Cancel</Button>
        <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color={adjustmentType === 'increase' ? 'success' : 'error'}
            disabled={loading} 
            startIcon={loading ? null : (adjustmentType === 'increase' ? <AddIcon /> : <RemoveIcon />)}
        >
          {loading ? <LoadingSpinner text="" /> : 'Submit Adjustment'} 
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StockAdjustmentModal;