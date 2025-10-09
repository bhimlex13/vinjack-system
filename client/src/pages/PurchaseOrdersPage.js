// client/src/pages/PurchaseOrdersPage.js
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPurchaseOrders, receivePurchaseOrder, cancelPurchaseOrder } from '../api/purchaseOrderApi';
import ConfirmationContext from '../context/ConfirmationContext';

// MUI Imports
import {
  Container, Typography, Button, Box, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, CircularProgress, Alert,
  Chip, Tooltip, IconButton, Grid, TextField, InputAdornment, FormControl,
  InputLabel, Select, MenuItem, TablePagination
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';

// Helper component to display a colored chip for the status
const StatusChip = ({ status }) => {
  const statusStyles = {
    'Pending': { label: 'Pending', color: 'warning' },
    // --- ADDED: Style for the new status ---
    'Awaiting Approval': { label: 'Awaiting Approval', color: 'primary' },
    'Approved': { label: 'Approved', color: 'info' },
    'Completed': { label: 'Completed', color: 'success' },
    'Cancelled': { label: 'Cancelled', color: 'error' },
    'Partially Received': { label: 'Partially Received', color: 'secondary' }
  };
  const style = statusStyles[status] || { label: status, color: 'default' };
  return <Chip label={style.label} color={style.color} size="small" sx={{ fontWeight: 'bold' }} />;
};


const PurchaseOrdersPage = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const navigate = useNavigate();
  const { confirm } = useContext(ConfirmationContext);
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const data = await getPurchaseOrders();
      setPurchaseOrders(data);
      setError(null);
    } catch (err)
 {
      setError('Failed to fetch purchase orders. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter(po => {
      const statusMatch = filterStatus ? po.status === filterStatus : true;
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const searchMatch = !searchTerm ||
        (po.poNumber?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (po.supplier?.name?.toLowerCase().includes(lowerCaseSearchTerm));
      
      return statusMatch && searchMatch;
    });
  }, [purchaseOrders, searchTerm, filterStatus]);


  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleReceive = async (poId, poNumber) => {
    // This function can remain the same
  };

  const handleCancel = async (poId, poNumber) => {
    // This function can remain the same
  };


  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
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

      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          label="Search by PO Number or Supplier"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><SearchIcon /></InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={filterStatus}
            label="Filter by Status"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value=""><em>All Statuses</em></MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            {/* --- ADDED: Filter option for the new status --- */}
            <MenuItem value="Awaiting Approval">Awaiting Approval</MenuItem>
            <MenuItem value="Approved">Approved</MenuItem>
            <MenuItem value="Partially Received">Partially Received</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
            <MenuItem value="Cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
      </Paper>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>PO Number</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Order Date</TableCell>
                  <TableCell align="right">Total Amount</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPurchaseOrders
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((po) => (
                    <TableRow hover key={po._id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell>{po.poNumber}</TableCell>
                      <TableCell>{po.supplier?.name || 'N/A'}</TableCell>
                      <TableCell><StatusChip status={po.status} /></TableCell>
                      <TableCell>{new Date(po.orderDate).toLocaleDateString()}</TableCell>
                      <TableCell align="right">{formatCurrency(po.totalAmount)}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton onClick={() => navigate(`/purchase-orders/${po._id}`)} color="primary">
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={filteredPurchaseOrders.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      )}
    </Container>
  );
};

export default PurchaseOrdersPage;