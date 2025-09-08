// client/src/pages/PurchaseOrderDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPurchaseOrderById, receivePurchaseOrder } from '../api/purchaseOrderApi';
import { toast } from 'react-toastify';

// MUI Imports
import {
  Container, Typography, Box, Paper, Grid, Button, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const PurchaseOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPo = async () => {
      try {
        setLoading(true);
        const data = await getPurchaseOrderById(id);
        setPo(data);
      } catch (err) {
        setError('Failed to fetch purchase order details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPo();
  }, [id]);

  const handleReceiveStock = async () => {
    try {
      const response = await receivePurchaseOrder(id);
      toast.success(response.message);
      setPo(response.purchaseOrder); // Update state with the updated PO
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to receive stock.');
      console.error(err);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!po) return <Alert severity="warning">Purchase Order not found.</Alert>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <div>
            <Typography variant="h4" gutterBottom>{po.poNumber}</Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Order Date: {new Date(po.orderDate).toLocaleDateString()}
            </Typography>
          </div>
          <Button variant="outlined" onClick={() => navigate('/purchase-orders')}>
            Back to List
          </Button>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Supplier Details</Typography>
            <Typography><strong>Name:</strong> {po.supplier.name}</Typography>
            <Typography><strong>Contact:</strong> {po.supplier.contactPerson || 'N/A'}</Typography>
            <Typography><strong>Number:</strong> {po.supplier.contactNumber || 'N/A'}</Typography>
            <Typography><strong>Address:</strong> {po.supplier.address || 'N/A'}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Order Status</Typography>
            <Typography><strong>Status:</strong> {po.status}</Typography>
            <Typography><strong>Total Amount:</strong> {formatCurrency(po.totalAmount)}</Typography>
          </Grid>
        </Grid>
        <Divider sx={{ my: 3 }} />
        <Typography variant="h6" gutterBottom>Items</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item Code</TableCell>
                <TableCell>Product Name</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Unit Cost</TableCell>
                <TableCell align="right">Subtotal</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {po.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.product.itemCode}</TableCell>
                  <TableCell>{item.product.name}</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">{formatCurrency(item.cost)}</TableCell>
                  <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            onClick={handleReceiveStock}
            disabled={po.status === 'Completed'}
          >
            {po.status === 'Completed' ? 'Stock Received' : 'Receive Stock & Add to Inventory'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default PurchaseOrderDetailPage;