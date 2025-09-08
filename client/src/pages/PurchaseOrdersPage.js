// client/src/pages/PurchaseOrdersPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPurchaseOrders } from '../api/purchaseOrderApi';

// MUI Imports
import {
  Container, Typography, Button, Box, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, CircularProgress, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const PurchaseOrdersPage = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      try {
        setLoading(true);
        const data = await getPurchaseOrders();
        setPurchaseOrders(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch purchase orders. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPurchaseOrders();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  const handleRowClick = (id) => {
    navigate(`/purchase-orders/${id}`);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Purchase Orders
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/purchase-orders/new')}
        >
          Create Purchase Order
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer>
            <Table stickyHeader aria-label="purchase orders table">
              <TableHead>
                <TableRow>
                  <TableCell>PO Number</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Order Date</TableCell>
                  <TableCell align="right">Total Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {purchaseOrders.map((po) => (
                  <TableRow 
                    hover 
                    key={po._id} 
                    onClick={() => handleRowClick(po._id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{po.poNumber}</TableCell>
                    <TableCell>{po.supplier?.name || 'N/A'}</TableCell>
                    <TableCell>{po.status}</TableCell>
                    <TableCell>{new Date(po.orderDate).toLocaleDateString()}</TableCell>
                    <TableCell align="right">{formatCurrency(po.totalAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Container>
  );
};

export default PurchaseOrdersPage;