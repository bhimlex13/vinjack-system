// client/src/components/PurchaseOrderDetailModal.js
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  Paper, Grid, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Divider, Chip
} from '@mui/material';

// Helper function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount || 0);
};

// Status chip component
const StatusChip = ({ status }) => {
  const statusStyles = {
    'Pending': { label: 'Pending', color: 'warning' },
    'Awaiting Approval': { label: 'Awaiting Approval', color: 'primary' },
    'Approved': { label: 'Approved', color: 'info' },
    'Completed': { label: 'Completed', color: 'success' },
    'Cancelled': { label: 'Cancelled', color: 'error' },
    'Partially Received': { label: 'Partially Received', color: 'secondary' }
  };
  const style = statusStyles[status] || { label: status, color: 'default' };
  return <Chip label={style.label} color={style.color} sx={{ fontWeight: 'bold' }} />;
};

const PurchaseOrderDetailModal = ({ poData, open, onClose }) => {
  if (!poData) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Purchase Order Details</DialogTitle>
      <DialogContent>
        <Paper sx={{ p: 3, mt: 2, border: 'none', boxShadow: 'none' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <div>
              <Typography variant="h4" gutterBottom>{poData.poNumber}</Typography>
              <Typography variant="subtitle1" color="textSecondary">
                Order Date: {new Date(poData.orderDate).toLocaleDateString()}
              </Typography>
            </div>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={3}>
            <Grid item size={{ xs: 12, md: 6 }}>
              <Typography variant="h6">Supplier Details</Typography>
              <Typography><strong>Name:</strong> {poData.supplier?.name || 'N/A'}</Typography>
              <Typography><strong>Contact:</strong> {poData.supplier?.contactPerson || 'N/A'}</Typography>
              <Typography><strong>Email:</strong> {poData.supplier?.email || 'N/A'}</Typography>
            </Grid>
            <Grid item size={{ xs: 12, md: 6 }}>
              <Typography variant="h6">Order Summary</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography><strong>Status:</strong></Typography> <StatusChip status={poData.status} />
              </Box>
              <Typography><strong>Total Amount:</strong> {formatCurrency(poData.totalAmount)}</Typography>
            </Grid>
          </Grid>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>Items</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Product Name</TableCell>
                  <TableCell align="right">Ordered</TableCell>
                  <TableCell align="right">Received</TableCell>
                  <TableCell align="right">Unit Cost</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {poData.items?.map((item, index) => (
                  <TableRow key={item._id || index}>
                    <TableCell>{item.product?.name || 'Product not found'}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{item.quantityReceived || 0}</TableCell>
                    <TableCell align="right">{formatCurrency(item.cost)}</TableCell>
                    <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PurchaseOrderDetailModal;