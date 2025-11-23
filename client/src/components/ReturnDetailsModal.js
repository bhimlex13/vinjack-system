// client/src/components/ReturnDetailsModal.js
import React from 'react';
import { motion } from 'framer-motion'; 

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Divider, Grid,
  Chip
} from '@mui/material';

const ReturnDetailsModal = ({ open, onClose, returnData }) => {
  if (!returnData) return null;

  const formatCurrency = (amount) => `₱${(amount || 0).toFixed(2)}`;

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

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="sm"
      // We replace the default Paper with a motion.div for animation
      PaperComponent={motion.div}
      PaperProps={{
        // Animation Props
        initial: { y: 50, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: 50, opacity: 0 },
        transition: { duration: 0.3 },
        
        // --- FIX: Styling Props to restore the "Card" look ---
        sx: {
          backgroundColor: 'background.paper', // Restores the white background
          backgroundImage: 'none', // Prevents dark mode overlay issues if needed
          boxShadow: 24, // Restores the shadow depth
          borderRadius: 2, // Restores rounded corners
          overflow: 'hidden' // keeps content inside rounded corners
        }
      }}
    >
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
        Return Transaction Details
      </DialogTitle>
      
      <DialogContent sx={{ mt: 2 }}>
        <Box>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Return ID:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{returnData._id}</Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Original Sale ID:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{returnData.originalSale?._id || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Return Date:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{new Date(returnData.createdAt).toLocaleString()}</Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Processed By:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{returnData.recordedBy?.fullName || 'N/A'}</Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <Typography variant="body1" component="span" sx={{ fontWeight: 'bold', mr: 1 }}>Return Outcome:</Typography>
            <Chip size="small" {...getOutcomeChipProps(returnData.outcome)} />
          </Box>

          <Typography variant="body1" gutterBottom><strong>Reason for Return:</strong></Typography>
          <Paper variant="outlined" sx={{ mb: 2, p: 2, backgroundColor: '#f9f9f9' }}>
            <Typography variant="body2">{returnData.reason}</Typography>
          </Paper>

          <Typography variant="h6" gutterBottom>Returned Items</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead sx={{ bgcolor: 'grey.100' }}>
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
                {returnData.servicesReturned?.map(serviceItem => (
                  <TableRow key={serviceItem.service?._id || serviceItem._id}>
                    <TableCell>{serviceItem.service?.name || 'N/A'} (Service)</TableCell>
                    <TableCell align="right">1</TableCell> 
                    <TableCell align="right">{formatCurrency(serviceItem.priceAtTime)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 2, textAlign: 'right' }}>
            <Typography variant="h6" color="primary.main">
              <strong>Total Refund: {formatCurrency(returnData.totalRefundAmount)}</strong>
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReturnDetailsModal;