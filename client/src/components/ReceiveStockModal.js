// client/src/components/ReceiveStockModal.js
import React, { useState, useEffect } from 'react';
import { receivePurchaseOrder } from '../api/purchaseOrderApi';
import { toast } from 'react-toastify';

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Typography, CircularProgress, Paper
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const ReceiveStockModal = ({ open, onClose, poData, onSuccess }) => {
  const [receivedItems, setReceivedItems] = useState([]);
  const [receiptFile, setReceiptFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (poData?.items) {
      const itemsToReceive = poData.items.map(item => ({
        productId: item.product._id,
        productName: item.product.name,
        quantityOrdered: item.quantity,
        quantityAlreadyReceived: item.quantityReceived || 0,
        quantityToReceive: '', // User will fill this
      }));
      setReceivedItems(itemsToReceive);
    }
  }, [poData]);

  const handleQuantityChange = (productId, value) => {
    const maxQty = receivedItems.find(i => i.productId === productId).quantityOrdered - receivedItems.find(i => i.productId === productId).quantityAlreadyReceived;
    const newQty = Math.max(0, Math.min(Number(value), maxQty));

    setReceivedItems(
      receivedItems.map(item =>
        item.productId === productId ? { ...item, quantityToReceive: newQty } : item
      )
    );
  };

  const handleFileChange = (event) => {
    setReceiptFile(event.target.files[0]);
  };

  const handleSubmit = async () => {
    const itemsWithQuantity = receivedItems
      .filter(item => Number(item.quantityToReceive) > 0)
      .map(item => ({
        productId: item.productId,
        quantityReceived: Number(item.quantityToReceive),
      }));

    if (itemsWithQuantity.length === 0) {
      toast.warn('Please enter a quantity for at least one item.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await receivePurchaseOrder(poData._id, itemsWithQuantity, receiptFile);
      toast.success(response.message);
      onSuccess(); // This will trigger a refresh on the detail page
      onClose();   // Close the modal
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to receive stock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Receive Stock for PO #{poData?.poNumber}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Enter the quantity of items received from the delivery. You can receive stock partially.
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell align="center">Ordered</TableCell>
                <TableCell align="center">Received</TableCell>
                <TableCell align="center">Quantity to Receive Now</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {receivedItems.map(item => (
                <TableRow key={item.productId}>
                  <TableCell>{item.productName}</TableCell>
                  <TableCell align="center">{item.quantityOrdered}</TableCell>
                  <TableCell align="center">{item.quantityAlreadyReceived}</TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      size="small"
                      value={item.quantityToReceive}
                      onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                      inputProps={{
                        min: 0,
                        max: item.quantityOrdered - item.quantityAlreadyReceived,
                      }}
                      sx={{ maxWidth: 100 }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 3, border: '1px dashed grey', p: 2, borderRadius: 1, textAlign: 'center' }}>
          <Typography gutterBottom>Upload Physical Receipt (Optional)</Typography>
          <Button
            component="label"
            variant="outlined"
            startIcon={<UploadFileIcon />}
          >
            Select File
            <input type="file" hidden onChange={handleFileChange} accept="image/*,application/pdf" />
          </Button>
          {receiptFile && <Typography sx={{ mt: 1 }}>Selected: {receiptFile.name}</Typography>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={24} /> : 'Confirm Reception & Update Stock'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReceiveStockModal;