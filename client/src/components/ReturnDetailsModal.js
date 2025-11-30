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
      case 'Restocked': return { label: 'Restocked', color: 'success' };
      case 'Replaced': return { label: 'Replaced', color: 'info' };
      case 'Refunded': return { label: 'Refunded Only', color: 'warning' };
      case 'Discarded': return { label: 'Discarded', color: 'error' };
      default: return { label: outcome || 'N/A', color: 'default' };
    }
  };

  return (
    <Dialog 
      open={open} 
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
            borderRadius: 3, 
            overflow: 'hidden',
            backgroundColor: 'background.paper', // FIX: Explicitly set background color
            boxShadow: 24, // FIX: Restore shadow depth
            width: '100%',
            m: 2
        }
      }}
    >
      <DialogTitle sx={{ bgcolor: 'grey.100', fontWeight: 700 }}>
        Return Details
      </DialogTitle>
      
      <DialogContent sx={{ mt: 2 }}>
        <Box>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary">RETURN ID</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{returnData._id}</Typography>
              
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>ORIGINAL SALE ID</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{returnData.originalSale?._id || 'N/A'}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary">DATE PROCESSED</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{new Date(returnData.createdAt).toLocaleString()}</Typography>
              
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>PROCESSED BY</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{returnData.recordedBy?.fullName || 'N/A'}</Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Outcome:</Typography>
            <Chip size="small" variant="filled" {...getOutcomeChipProps(returnData.outcome)} />
          </Box>

          <Typography variant="caption" color="text.secondary">REASON</Typography>
          <Paper variant="outlined" sx={{ mb: 3, p: 2, backgroundColor: '#fafafa', borderRadius: 2 }}>
            <Typography variant="body2">{returnData.reason}</Typography>
          </Paper>

          <Typography variant="h6" fontSize="1rem" gutterBottom fontWeight={700}>Returned Items</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'grey.50' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Qty</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Refund</TableCell>
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

          <Box sx={{ mt: 3, textAlign: 'right' }}>
            <Typography variant="h6" color="primary.main">
              Total Refund: <strong>{formatCurrency(returnData.totalRefundAmount)}</strong>
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained" sx={{ borderRadius: 2 }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReturnDetailsModal;