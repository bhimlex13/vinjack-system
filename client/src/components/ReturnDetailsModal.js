// client/src/components/ReturnDetailsModal.js
import React from 'react';

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Divider, Grid
} from '@mui/material';

const ReturnDetailsModal = ({ open, onClose, returnData }) => {
  if (!returnData) return null;

  const formatCurrency = (amount) => `₱${(amount || 0).toFixed(2)}`;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Return Transaction Details</DialogTitle>
      <DialogContent>
        <Box>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2"><strong>Return ID:</strong> {returnData._id}</Typography>
              <Typography variant="body2"><strong>Original Sale ID:</strong> {returnData.originalSale?._id || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2"><strong>Return Date:</strong> {new Date(returnData.createdAt).toLocaleString()}</Typography>
              <Typography variant="body2"><strong>Processed By:</strong> {returnData.recordedBy?.fullName || 'N/A'}</Typography>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />

          <Typography variant="body1" gutterBottom><strong>Reason for Return:</strong></Typography>
          <Typography variant="body2" sx={{ mb: 2, p: 1, border: '1px solid #eee', borderRadius: 1 }}>{returnData.reason}</Typography>

          <Typography variant="h6" gutterBottom>Returned Items</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Refund Subtotal</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {returnData.itemsReturned?.map(item => (
                  <TableRow key={item.product?._id || item._id}>
                    <TableCell>{item.product?.name || 'N/A'}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">{formatCurrency(item.priceAtTime * item.quantity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 2, textAlign: 'right' }}>
            <Typography variant="h6">
              <strong>Total Refund: {formatCurrency(returnData.totalRefundAmount)}</strong>
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReturnDetailsModal;