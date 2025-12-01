// client/src/pages/PurchaseOrdersPage.js
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPurchaseOrders, getSuppliers } from '../api/purchaseOrderApi';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';
import { toast } from 'react-toastify'; 
import { motion } from 'framer-motion'; 
import AuthContext from '../context/AuthContext';

// MUI Imports
import {
  Container, Typography, Button, Box, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Alert,
  Chip, Tooltip, IconButton, Grid, TextField, InputAdornment, FormControl,
  InputLabel, Select, MenuItem, TablePagination,
  Autocomplete,
  ButtonGroup,
  Divider,
  Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import DescriptionIcon from '@mui/icons-material/Description';
import RefreshIcon from '@mui/icons-material/Refresh';

import LoadingSpinner from '../components/LoadingSpinner';

const StatusChip = ({ status }) => {
  const statusStyles = {
    'Pending': { label: 'Pending', color: 'warning' },
    'Awaiting Approval': { label: 'Awaiting Approval', color: 'primary' },
    'Agreement Uploaded - Awaiting Delivery': { label: 'Awaiting Delivery', color: 'info' },
    'Approved': { label: 'Approved', color: 'info' },
    'Completed': { label: 'Completed', color: 'success' },
    'Cancelled': { label: 'Cancelled', color: 'error' },
    'Partially Received': { label: 'Partially Received', color: 'secondary' }
  };
  const style = statusStyles[status] || { label: status, color: 'default' };
  return <Chip label={style.label} color={style.color} size="small" variant="filled" sx={{ fontWeight: 700, borderRadius: 1 }} />;
};

const PurchaseOrdersPage = () => {
  const today = new Date().toISOString().split('T')[0];

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  const { socket } = useContext(AuthContext); 
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPoType, setFilterPoType] = useState('');
  const [filterSupplier, setFilterSupplier] = useState(null); 
  
  // Date Filter State
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [datePreset, setDatePreset] = useState('today');
  
  const [suppliersList, setSuppliersList] = useState([]); 
  const [isFilterLoading, setIsFilterLoading] = useState(true); 

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };

  const fetchData = async () => {
    try {
      if (purchaseOrders.length === 0) setLoading(true);
      
      const [poData, suppliersData] = await Promise.all([
        getPurchaseOrders(),
        getSuppliers()
      ]);
      
      setPurchaseOrders(poData);
      if (suppliersList.length === 0) {
          setSuppliersList(suppliersData.filter(s => s.status === 'Approved'));
      }
      
      setError(null);
    } catch (err) {
      const errorMsg = 'Failed to fetch page data. Please try again later.';
      setError(errorMsg);
      if(loading) toast.error(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
      setIsFilterLoading(false); 
    }
  };

  useEffect(() => {
    fetchData();
    if (!socket) return;
    const handleRealTimeUpdate = (data) => {
      console.log('Real-time Update: Refreshing List...', data);
      fetchData();
    };
    socket.on('po_supplier_update', handleRealTimeUpdate);
    return () => {
      socket.off('po_supplier_update', handleRealTimeUpdate);
    };
    // eslint-disable-next-line
  }, [socket]);
  
  const handleDatePreset = (preset) => {
    const now = new Date();
    let start = now;
    let end = now;
    setDatePreset(preset); 

    if (preset === 'today') {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (preset === 'week') {
      start = startOfWeek(now);
      end = endOfDay(now);
    } else if (preset === 'month') {
      start = startOfMonth(now);
      end = endOfDay(now);
    } else if (preset === 'year') {
      start = startOfYear(now);
      end = endOfDay(now);
    } else if (preset === 'all') {
      start = new Date(0); 
      end = endOfDay(now);
    }

    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
    setPage(0);
  };

  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter(po => {
      const poDate = new Date(po.orderDate);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      const dateMatch = poDate >= start && poDate <= end;

      const statusMatch = filterStatus ? po.status === filterStatus : true;
      const typeMatch = filterPoType ? po.poType === filterPoType : true;
      const supplierMatch = filterSupplier ? po.supplier?._id === filterSupplier._id : true;

      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const searchMatch = !searchTerm ||
        (po.poNumber?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (po.supplier?.name?.toLowerCase().includes(lowerCaseSearchTerm));
      
      return dateMatch && statusMatch && typeMatch && supplierMatch && searchMatch;
    });
  }, [purchaseOrders, searchTerm, filterStatus, filterPoType, filterSupplier, startDate, endDate]); 

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

  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(0); 
  };

  if (loading && purchaseOrders.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <LoadingSpinner text="Loading Orders..." />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      
      <motion.div initial="hidden" animate="visible" variants={pageVariants}>
        
        {/* Header */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 4, gap: 2 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.dark', display: 'flex' }}>
                <DescriptionIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={700}>Purchase Orders</Typography>
                <Typography variant="body2" color="text.secondary">Manage supplier orders and consignments</Typography>
              </Box>
            </Stack>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/purchase-orders/new')}
              sx={{ fontWeight: 600, px: 3, borderRadius: 2, width: { xs: '100%', sm: 'auto' } }}
            >
              Create Purchase Order
            </Button>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 2 }}>
            <Grid container spacing={2} alignItems="center">
            
            {/* Date Presets - Scrollable container for mobile */}
            <Grid size={{ xs: 12 }}>
                <Box sx={{ overflowX: 'auto', pb: 0.5, whiteSpace: 'nowrap' }}>
                    <ButtonGroup variant="outlined" aria-label="date range presets" size="small">
                        {['today', 'week', 'month', 'year', 'all'].map((preset) => (
                            <Button 
                                key={preset}
                                variant={datePreset === preset ? 'contained' : 'outlined'} 
                                onClick={() => handleDatePreset(preset)}
                                sx={{ textTransform: 'capitalize' }}
                            >
                                {preset === 'all' ? 'All Time' : preset}
                            </Button>
                        ))}
                    </ButtonGroup>
                </Box>
            </Grid>

            {/* Date Inputs */}
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
            </Grid>

            {/* Search Input */}
            <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                label="Search PO or Supplier"
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
                fullWidth
                InputProps={{
                    startAdornment: (
                    <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>
                    ),
                }}
                />
            </Grid>
            
            <Grid size={{ xs: 12 }} sx={{ my: 0.5 }}><Divider /></Grid>

            {/* Row 3: Supplier, Status, Type */}
            <Grid size={{ xs: 12, md: 4 }}>
                <Autocomplete
                options={suppliersList}
                getOptionLabel={(option) => option.name}
                value={filterSupplier}
                onChange={(e, newValue) => handleFilterChange(setFilterSupplier, newValue)}
                isOptionEqualToValue={(o, v) => o._id === v._id}
                renderInput={(params) => <TextField {...params} label="Filter by Supplier" size="small" />}
                disabled={isFilterLoading}
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FormControl size="small" fullWidth>
                <InputLabel>Filter by Status</InputLabel>
                <Select
                    value={filterStatus}
                    label="Filter by Status"
                    onChange={(e) => handleFilterChange(setFilterStatus, e.target.value)}
                >
                    <MenuItem value=""><em>All Statuses</em></MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="Awaiting Approval">Awaiting Approval</MenuItem>
                    <MenuItem value="Agreement Uploaded - Awaiting Delivery">Awaiting Delivery</MenuItem>
                    <MenuItem value="Approved">Approved</MenuItem>
                    <MenuItem value="Partially Received">Partially Received</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                    <MenuItem value="Cancelled">Cancelled</MenuItem>
                </Select>
                </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FormControl size="small" fullWidth>
                <InputLabel>Filter by Type</InputLabel>
                <Select
                    value={filterPoType}
                    label="Filter by Type"
                    onChange={(e) => handleFilterChange(setFilterPoType, e.target.value)}
                >
                    <MenuItem value=""><em>All Types</em></MenuItem>
                    <MenuItem value="Purchase">Purchase</MenuItem>
                    <MenuItem value="Consignment">Consignment</MenuItem>
                </Select>
                </FormControl>
            </Grid>
            </Grid>
        </Paper>
        
        {error ? (
            <Alert severity="error">{error}</Alert>
        ) : (
            <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 3, boxShadow: 3 }}>
             <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end', bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                <Tooltip title="Refresh Data">
                    <IconButton onClick={fetchData} size="small">
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
            </Box>
            <TableContainer>
                <Table stickyHeader>
                <TableHead>
                    <TableRow sx={{ '& .MuiTableCell-head': { bgcolor: 'grey.50', fontWeight: 700 } }}>
                    <TableCell>PO Number</TableCell>
                    <TableCell>Supplier</TableCell>
                    <TableCell>Order Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Order Date</TableCell>
                    <TableCell align="right">Total Amount</TableCell>
                    <TableCell align="center">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {filteredPurchaseOrders.length > 0 ? (
                        filteredPurchaseOrders
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((po) => (
                            <TableRow hover key={po._id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{po.poNumber}</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{po.supplier?.name || 'N/A'}</TableCell>
                            <TableCell>
                                <Chip 
                                label={po.poType || 'Purchase'} 
                                size="small" 
                                variant="outlined"
                                color={po.poType === 'Consignment' ? 'info' : 'default'}
                                sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                                />
                            </TableCell>
                            <TableCell><StatusChip status={po.status} /></TableCell>
                            <TableCell>{new Date(po.orderDate).toLocaleDateString()}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(po.totalAmount)}</TableCell>
                            <TableCell align="center">
                                <Tooltip title="View Details">
                                <IconButton 
                                    onClick={() => navigate(`/purchase-orders/${po._id}`)} 
                                    color="primary"
                                    size="small"
                                    sx={{ bgcolor: 'primary.50', '&:hover': { bgcolor: 'primary.100' } }}
                                >
                                    <VisibilityIcon fontSize="small" />
                                </IconButton>
                                </Tooltip>
                            </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                No purchase orders found.
                            </TableCell>
                        </TableRow>
                    )}
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
      </motion.div>
    </Container>
  );
};

export default PurchaseOrdersPage;