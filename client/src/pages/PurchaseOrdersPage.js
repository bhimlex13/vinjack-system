// client/src/pages/PurchaseOrdersPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPurchaseOrders, getSuppliers } from '../api/purchaseOrderApi';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { toast } from 'react-toastify'; 
import { motion } from 'framer-motion'; // --- NEW IMPORT ---

// MUI Imports
import {
  Container, Typography, Button, Box, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Alert,
  Chip, Tooltip, IconButton, Grid, TextField, InputAdornment, FormControl,
  InputLabel, Select, MenuItem, TablePagination,
  Autocomplete,
  ButtonGroup
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';

// --- NEW IMPORT ---
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
  return <Chip label={style.label} color={style.color} size="small" sx={{ fontWeight: 'bold' }} />;
};


const PurchaseOrdersPage = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPoType, setFilterPoType] = useState('');
  const [filterSupplier, setFilterSupplier] = useState(null); 
  const [datePreset, setDatePreset] = useState('all'); 
  const [startDate, setStartDate] = useState(new Date(0));
  const [endDate, setEndDate] = useState(endOfDay(new Date())); 
  
  const [suppliersList, setSuppliersList] = useState([]); 
  const [isFilterLoading, setIsFilterLoading] = useState(true); 

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // --- FRAMER MOTION VARIANTS ---
  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };
  // ------------------------------

  const fetchData = async () => {
    try {
      setLoading(true);
      setIsFilterLoading(true); 
      
      const [poData, suppliersData] = await Promise.all([
        getPurchaseOrders(),
        getSuppliers()
      ]);
      
      setPurchaseOrders(poData);
      setSuppliersList(suppliersData.filter(s => s.status === 'Approved')); 
      
      setError(null);
    } catch (err) {
      const errorMsg = 'Failed to fetch page data. Please try again later.';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
      setIsFilterLoading(false); 
    }
  };

  useEffect(() => {
    fetchData();
  }, []); 
  
  const handleDatePreset = (preset) => {
    const now = new Date();
    let start = startOfDay(now);
    let end = endOfDay(now);
    setDatePreset(preset); 

    if (preset === 'week') { start = startOfWeek(now); }
    else if (preset === 'month') { start = startOfMonth(now); }
    else if (preset === 'year') { start = startOfYear(now); }
    else if (preset === 'all') { start = new Date(0); } 
    
    setStartDate(start);
    setEndDate(end);
    setPage(0); 
  };

  const filteredPurchaseOrders = useMemo(() => {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    return purchaseOrders.filter(po => {
      const poDate = new Date(po.orderDate);
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

  // --- RENDER LOADING SPINNER ---
  if (loading && purchaseOrders.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <LoadingSpinner text="Loading Orders..." />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      
      {/* --- ANIMATED CONTENT --- */}
      <motion.div initial="hidden" animate="visible" variants={pageVariants}>
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

        <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2}>
            {/* Row 1: Date Presets */}
            <Grid item size={{ xs: 12 }}>
                <ButtonGroup fullWidth>
                <Button variant={datePreset === 'today' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('today')}>Today</Button>
                <Button variant={datePreset === 'week' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('week')}>This Week</Button>
                <Button variant={datePreset === 'month' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('month')}>This Month</Button>
                <Button variant={datePreset === 'year' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('year')}>This Year</Button>
                <Button variant={datePreset === 'all' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('all')}>All Time</Button>
                </ButtonGroup>
            </Grid>

            {/* Row 2: Search and Supplier */}
            <Grid item size={{ xs: 12, md: 6 }}>
                <TextField
                label="Search by PO Number or Supplier"
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
                fullWidth
                InputProps={{
                    startAdornment: (
                    <InputAdornment position="start"><SearchIcon /></InputAdornment>
                    ),
                }}
                />
            </Grid>
            <Grid item size={{ xs: 12, md: 6 }}>
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
            
            {/* Row 3: Status and Type */}
            <Grid item size={{ xs: 6, md: 6 }}>
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
            <Grid item size={{ xs: 6, md: 6 }}>
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
            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <TableContainer>
                <Table stickyHeader>
                <TableHead>
                    <TableRow>
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
                    {filteredPurchaseOrders
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((po) => (
                        <TableRow hover key={po._id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell>{po.poNumber}</TableCell>
                        <TableCell>{po.supplier?.name || 'N/A'}</TableCell>
                        <TableCell>
                            <Chip 
                            label={po.poType || 'Purchase'} 
                            size="small" 
                            color={po.poType === 'Consignment' ? 'info' : 'default'}
                            />
                        </TableCell>
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
      </motion.div>
    </Container>
  );
};

export default PurchaseOrdersPage;