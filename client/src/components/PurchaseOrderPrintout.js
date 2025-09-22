// client/src/components/PurchaseOrderPrintout.js
import React from 'react';

// MUI Imports
import {
  Box, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Divider, Grid
} from '@mui/material';

// This component is forwardRef'd to allow the parent to get a ref to the Box for printing
const PurchaseOrderPrintout = React.forwardRef(({ poData }, ref) => {
  if (!poData) return null;

  const formatCurrency = (amount) => `₱${(amount || 0).toFixed(2)}`;

  return (
    <Box ref={ref} sx={{ p: 3, fontFamily: 'Arial, sans-serif', color: 'black' }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          PURCHASE ORDER
        </Typography>
        <Typography variant="h6">VinJack System</Typography>
      </Box>

      {/* PO Details and Supplier Info */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <Typography variant="body1"><strong>To:</strong> {poData.supplier?.name}</Typography>
          <Typography variant="body2">{poData.supplier?.address || 'N/A'}</Typography>
          <Typography variant="body2"><strong>Contact:</strong> {poData.supplier?.contactPerson || 'N/A'}</Typography>
          <Typography variant="body2"><strong>Phone:</strong> {poData.supplier?.contactNumber || 'N/A'}</Typography>
        </Grid>
        <Grid item xs={6} sx={{ textAlign: 'right' }}>
          <Typography variant="body1"><strong>PO #:</strong> {poData.poNumber}</Typography>
          <Typography variant="body1"><strong>Date:</strong> {new Date(poData.orderDate).toLocaleDateString()}</Typography>
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 2 }} />

      {/* Items Table */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Item Code</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Product Name</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Qty</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Unit Cost</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Subtotal</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {poData.items?.map((item) => (
              <TableRow key={item.product?._id || item._id}>
                <TableCell>{item.product?.itemCode || 'N/A'}</TableCell>
                <TableCell>{item.product?.name || 'N/A'}</TableCell>
                <TableCell align="right">{item.quantity}</TableCell>
                <TableCell align="right">{formatCurrency(item.cost)}</TableCell>
                <TableCell align="right">{formatCurrency(item.quantity * item.cost)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Grand Total */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Box sx={{ width: '40%', textAlign: 'right' }}>
          <Typography variant="h6">
            <strong>Grand Total: {formatCurrency(poData.totalAmount)}</strong>
          </Typography>
        </Box>
      </Box>

      {/* Notes */}
      {poData.notes && (
        <Box sx={{ mt: 3, p: 2, border: '1px solid #ddd' }}>
          <Typography variant="body1"><strong>Notes:</strong></Typography>
          <Typography variant="body2">{poData.notes}</Typography>
        </Box>
      )}
    </Box>
  );
});

export default PurchaseOrderPrintout;