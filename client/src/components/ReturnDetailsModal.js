// client/src/components/ReturnDetailsModal.js
import React from 'react';

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Divider, Grid,
  // --- NEW: Import Chip ---
  Chip
} from '@mui/material';

const ReturnDetailsModal = ({ open, onClose, returnData }) => {
  if (!returnData) return null;

  const formatCurrency = (amount) => `₱${(amount || 0).toFixed(2)}`;

  // --- NEW: Function to get chip style based on outcome ---
  const getOutcomeChipProps = (outcome) => {
    switch (outcome) {
      case 'Restocked':
        return { label: 'Restocked', color: 'success' };
      case 'Replaced':
        return { label: 'Replaced', color: 'info' };
      case 'Refunded':
        return { label: 'Refunded Only', color: 'warning' };
      case 'Discarded':
        return { label: 'Discarded', color: 'error' };
      default:
        return { label: outcome || 'N/A', color: 'default' };
    }
  };
  // --- END NEW ---

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

          {/* --- MODIFIED: Display Outcome using Chip --- */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" component="span" sx={{ fontWeight: 'bold', mr: 1 }}>Return Outcome:</Typography>
            <Chip size="small" {...getOutcomeChipProps(returnData.outcome)} />
          </Box>
          {/* --- END MODIFICATION --- */}

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
                {/* --- Display returned services if any --- */}
                {returnData.servicesReturned?.map(serviceItem => (
                  <TableRow key={serviceItem.service?._id || serviceItem._id}>
                    <TableCell>{serviceItem.service?.name || 'N/A'} (Service)</TableCell>
                    <TableCell align="right">1</TableCell> {/* Services are usually quantity 1 */}
                    <TableCell align="right">{formatCurrency(serviceItem.priceAtTime)}</TableCell>
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