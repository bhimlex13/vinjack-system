// client/src/pages/PurchaseOrdersPage.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPurchaseOrders, receivePurchaseOrder, cancelPurchaseOrder } from '../api/purchaseOrderApi';
import ConfirmationContext from '../context/ConfirmationContext';

// MUI Imports
import {
  Container, Typography, Button, Box, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, CircularProgress, Alert,
  Chip, Tooltip, IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';

// Helper component to display a colored chip for the status
const StatusChip = ({ status }) => {
  const statusStyles = {
    Pending: { label: 'Pending', color: 'warning' },
    Approved: { label: 'Approved', color: 'info' },
    Completed: { label: 'Completed', color: 'success' },
    Cancelled: { label: 'Cancelled', color: 'error' },
    'Partially Received': { label: 'Partially Received', color: 'secondary' }
  };
  const style = statusStyles[status] || { label: status, color: 'default' };
  return <Chip label={style.label} color={style.color} size="small" />;
};


const PurchaseOrdersPage = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { confirm } = useContext(ConfirmationContext);

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

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };
  
  // Handler for receiving a PO
  const handleReceive = async (poId, poNumber) => {
    const isConfirmed = await confirm(`Are you sure you want to mark PO #${poNumber} as received? This will add its items to your inventory.`);
    if (isConfirmed) {
      try {
        await receivePurchaseOrder(poId);
        // Refresh the list to show the updated status
        fetchPurchaseOrders(); 
      } catch (err) {
        alert(`Failed to receive order: ${err.response?.data?.message || 'Server Error'}`);
      }
    }
  };

  // Handler for cancelling a PO
  const handleCancel = async (poId, poNumber) => {
    const isConfirmed = await confirm(`Are you sure you want to cancel PO #${poNumber}? This action cannot be undone.`);
    if (isConfirmed) {
      try {
        await cancelPurchaseOrder(poId);
        // Refresh the list
        fetchPurchaseOrders();
      } catch (err) {
        alert(`Failed to cancel order: ${err.response?.data?.message || 'Server Error'}`);
      }
    }
  };


  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
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
                  <TableCell sx={{ fontWeight: 'bold' }}>PO Number</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Supplier</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Order Date</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total Amount</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {purchaseOrders.map((po) => {
                  const isActionable = po.status === 'Pending' || po.status === 'Approved';
                  return (
                    <TableRow hover key={po._id}>
                      <TableCell>{po.poNumber}</TableCell>
                      <TableCell>{po.supplier?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <StatusChip status={po.status} />
                      </TableCell>
                      <TableCell>{new Date(po.orderDate).toLocaleDateString()}</TableCell>
                      <TableCell align="right">{formatCurrency(po.totalAmount)}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton onClick={() => navigate(`/purchase-orders/${po._id}`)} color="primary">
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Receive Stock">
                          <span> {/* Span is needed to show tooltip on disabled button */}
                            <IconButton 
                              onClick={() => handleReceive(po._id, po.poNumber)} 
                              color="success" 
                              disabled={!isActionable}
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Cancel Order">
                          <span>
                            <IconButton 
                              onClick={() => handleCancel(po._id, po.poNumber)} 
                              color="error" 
                              disabled={!isActionable}
                            >
                              <CancelIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Container>
  );
};

export default PurchaseOrdersPage;