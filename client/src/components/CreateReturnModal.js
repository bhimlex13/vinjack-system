// client/src/components/CreateReturnModal.js
import React, { useState } from 'react';
import { getSaleById } from '../api/saleApi'; // We will need to create this API function
import { createReturn } from '../api/returnApi';
import { toast } from 'react-toastify';

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, TextField, Button,
  Typography, CircularProgress, Alert, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, InputAdornment, IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';


const CreateReturnModal = ({ open, onClose, onReturnSuccess }) => {
  const [step, setStep] = useState('find'); // 'find', 'process', 'loading', 'error'
  const [saleIdInput, setSaleIdInput] = useState('');
  const [saleDetails, setSaleDetails] = useState(null);
  const [itemsToReturn, setItemsToReturn] = useState({});
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const resetState = () => {
    setStep('find');
    setSaleIdInput('');
    setSaleDetails(null);
    setItemsToReturn({});
    setReason('');
    setError('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFindSale = async () => {
    if (!saleIdInput) {
      setError('Please enter a Sale ID.');
      return;
    }
    setStep('loading');
    setError('');
    try {
      const data = await getSaleById(saleIdInput);
      setSaleDetails(data);
      // Initialize quantities to return to 0
      const initialItems = {};
      data.items.forEach(item => {
        initialItems[item.product._id] = 0;
      });
      setItemsToReturn(initialItems);
      setStep('process');
    } catch (err) {
      setError(err.response?.data?.message || 'Sale not found or error fetching details.');
      setStep('error');
    }
  };
  
  const handleQuantityChange = (productId, amount) => {
    const soldItem = saleDetails.items.find(i => i.product._id === productId);
    if (!soldItem) return;

    setItemsToReturn(prev => {
        const currentQty = prev[productId] || 0;
        const newQty = currentQty + amount;
        if (newQty >= 0 && newQty <= soldItem.quantity) {
            return { ...prev, [productId]: newQty };
        }
        return prev;
    });
  };

  const handleProcessReturn = async () => {
    const returnPayload = {
        originalSaleId: saleDetails._id,
        reason,
        itemsReturned: Object.entries(itemsToReturn)
            .filter(([_, qty]) => qty > 0)
            .map(([productId, qty]) => ({ product: productId, quantity: qty })),
    };

    if (returnPayload.itemsReturned.length === 0) {
        toast.warn('You must select at least one item to return.');
        return;
    }
    if (!reason.trim()) {
        toast.warn('A reason for the return is required.');
        return;
    }
    
    setStep('loading');
    try {
        await createReturn(returnPayload);
        toast.success('Return processed successfully!');
        onReturnSuccess();
        handleClose();
    } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to process return.');
        setStep('process'); // Go back to the form on error
    }
  };

  const renderContent = () => {
    if (step === 'loading') {
      return <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>;
    }
    if (step === 'error') {
      return <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>;
    }
    if (step === 'process' && saleDetails) {
      return (
        <Box>
          <Typography variant="h6">Sale Details</Typography>
          <Typography variant="body2">ID: {saleDetails._id}</Typography>
          <Typography variant="body2">Date: {new Date(saleDetails.createdAt).toLocaleString()}</Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>Customer: {saleDetails.customer?.name || 'N/A'}</Typography>
          
          <Typography variant="h6" sx={{ mt: 2 }}>Select Items to Return</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell align="center">Sold Qty</TableCell>
                  <TableCell align="center">Return Qty</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {saleDetails.items.map(item => (
                  <TableRow key={item.product._id}>
                    <TableCell>{item.product.name}</TableCell>
                    <TableCell align="center">{item.quantity}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconButton size="small" onClick={() => handleQuantityChange(item.product._id, -1)}><RemoveIcon fontSize="small"/></IconButton>
                          <Typography sx={{ mx: 1 }}>{itemsToReturn[item.product._id]}</Typography>
                          <IconButton size="small" onClick={() => handleQuantityChange(item.product._id, 1)}><AddIcon fontSize="small"/></IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TextField
            label="Reason for Return"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            multiline
            rows={2}
            required
            sx={{ mt: 2 }}
          />
        </Box>
      );
    }
    // Default to 'find' step
    return (
      <TextField
        autoFocus
        margin="dense"
        label="Enter Original Sale ID"
        fullWidth
        variant="outlined"
        value={saleIdInput}
        onChange={(e) => setSaleIdInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleFindSale()}
        helperText="You can find this on the customer's receipt."
      />
    );
  };
  
  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Process New Return</DialogTitle>
      <DialogContent>{renderContent()}</DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {step === 'find' && <Button onClick={handleFindSale} variant="contained">Find Sale</Button>}
        {step === 'error' && <Button onClick={resetState} variant="contained">Try Again</Button>}
        {step === 'process' && <Button onClick={handleProcessReturn} variant="contained" color="success">Process Return</Button>}
      </DialogActions>
    </Dialog>
  );
};

export default CreateReturnModal;