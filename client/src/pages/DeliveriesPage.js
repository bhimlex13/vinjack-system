// client/src/pages/DeliveriesPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getDeliveries } from '../api/deliveryApi';
import RecordDeliveryForm from '../components/RecordDeliveryForm';
import { motion, AnimatePresence } from 'framer-motion';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';

// MUI Imports
import { 
  Box, Button, Typography, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, Table, TableBody, TableCell, TableHead, TableRow, Chip,
  Grid, Divider, Stack, Container, TextField, InputAdornment, FormControl,
  InputLabel, Select, MenuItem, Tooltip, ButtonGroup, IconButton
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

// Icons
import AddIcon from '@mui/icons-material/Add';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';

import LoadingSpinner from '../components/LoadingSpinner';

const DeliveriesPage = () => {
  const today = new Date().toISOString().split('T')[0];

  const [deliveries, setDeliveries] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  
  // Date Filter State
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [datePreset, setDatePreset] = useState('today');

  const navigate = useNavigate();

  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };

  const fetchDeliveries = async () => {
    try {
      setIsLoading(true);
      const [deliveriesResponse, suppliersResponse] = await Promise.all([
        getDeliveries(),
        api.get('/suppliers?status=Approved')
      ]);
      setDeliveries(deliveriesResponse);
      setSuppliers(suppliersResponse.data);
    } catch (err) {
      setError('Failed to fetch delivery data.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

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
      start = new Date(0); // Epoch start
      end = endOfDay(now);
    }

    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(delivery => {
      const deliveryDate = new Date(delivery.deliveryDate || delivery.createdAt);
      
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const dateMatch = deliveryDate >= start && deliveryDate <= end;
      const supplierMatch = filterSupplier ? delivery.supplier?._id === filterSupplier : true;
      
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const searchMatch = !searchTerm ||
        (delivery.supplier?.name?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (delivery.purchaseOrder?.poNumber?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (delivery.deliveryType?.toLowerCase().includes(lowerCaseSearchTerm));
      
      return supplierMatch && searchMatch && dateMatch;
    });
  }, [deliveries, searchTerm, filterSupplier, startDate, endDate]);

  const handleDeliveryFormClose = () => {
    setIsDeliveryModalOpen(false);
    fetchDeliveries();
  };

  const columns = [
    {
      field: 'date',
      headerName: 'Date', flex: 1, minWidth: 200,
      valueGetter: (value, row) => {
        const date = row.deliveryDate || row.createdAt;
        return date ? new Date(date) : null;
      },
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 1 }}>
            <Typography variant="body2" fontWeight={600}>
                {params.value ? format(params.value, 'MMM dd, yyyy') : 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                {params.value ? format(params.value, 'hh:mm a') : ''}
            </Typography>
        </Box>
      ),
    },
    { 
      field: 'supplier', headerName: 'Supplier', flex: 1, minWidth: 180,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={500}>{params.row.supplier?.name || 'N/A'}</Typography>
      )
    },
    {
      field: 'purchaseOrder', headerName: 'Origin', flex: 1, minWidth: 150,
      sortable: false,
      renderCell: (params) => params.row.purchaseOrder 
        ? <Chip label={`PO: ${params.row.purchaseOrder.poNumber}`} color="primary" variant="outlined" size="small" sx={{ fontWeight: 600 }} /> 
        : <Chip label="Direct Delivery" color="secondary" variant="outlined" size="small" sx={{ fontWeight: 600 }} />
    },
    {
      field: 'deliveryType', headerName: 'Type', flex: 0.5, minWidth: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value || 'Purchase'} 
          color={params.value === 'Consignment' ? 'info' : 'default'} 
          variant="filled"
          size="small" 
          sx={{ fontWeight: 600, borderRadius: 1 }}
        />
      )
    },
    {
      field: 'recordedBy', headerName: 'Recorded By', flex: 1, minWidth: 180,
      valueGetter: (value, row) => row.recordedBy?.fullName || 'N/A'
    },
    {
      field: 'actions', headerName: 'Actions', width: 100, sortable: false, align: 'center', headerAlign: 'center',
      renderCell: (params) => (
        <Tooltip title="View Details">
            <IconButton 
                color="primary" 
                size="small" 
                onClick={() => setSelectedDelivery(params.row)}
                sx={{ bgcolor: 'primary.50', '&:hover': { bgcolor: 'primary.100' } }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
        </Tooltip>
      )
    }
  ];

  if (isLoading && deliveries.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <LoadingSpinner text="Loading Deliveries..." />
      </Box>
    );
  }

  if (error) return <Typography color="error" sx={{ p: 3 }}>{error}</Typography>;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      
      <motion.div initial="hidden" animate="visible" variants={pageVariants}>
        
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.dark', display: 'flex' }}>
                <LocalShippingIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={700}>Deliveries Hub</Typography>
                <Typography variant="body2" color="text.secondary">Log direct deliveries or create new purchase orders</Typography>
              </Box>
          </Stack>
          
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button 
                variant="contained" 
                color="success"
                startIcon={<LocalShippingIcon />}
                onClick={() => setIsDeliveryModalOpen(true)}
                sx={{ fontWeight: 600, px: 3 }}
            >
                Record Delivery
            </Button>
            <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/purchase-orders/new')}
                sx={{ fontWeight: 600, px: 3 }}
            >
                Create PO
            </Button>
          </Stack>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 2 }}>
          <Grid container spacing={2} alignItems="center">
            
            {/* Date Presets - Grid V2 Syntax */}
            <Grid size={{ xs: 12 }}>
                <ButtonGroup fullWidth variant="outlined" aria-label="date range presets" size="small">
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
            </Grid>

            {/* Date Inputs */}
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
            </Grid>

            <Grid size={{ xs: 12 }} sx={{ my: 0.5 }}><Divider /></Grid>

            {/* Search and Supplier Filter */}
            <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                    fullWidth
                    placeholder="Search by Supplier, PO Number, or Type..."
                    variant="outlined"
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                        <SearchIcon color="action" />
                        </InputAdornment>
                    ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth size="small">
                    <InputLabel>Filter by Supplier</InputLabel>
                    <Select
                    value={filterSupplier}
                    label="Filter by Supplier"
                    onChange={(e) => setFilterSupplier(e.target.value)}
                    sx={{ borderRadius: 2 }}
                    >
                    <MenuItem value=""><em>All Suppliers</em></MenuItem>
                    {suppliers.map(sup => (
                        <MenuItem key={sup._id} value={sup._id}>{sup.name}</MenuItem>
                    ))}
                    </Select>
                </FormControl>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ 
            height: '70vh', 
            width: '100%', 
            borderRadius: 3, 
            boxShadow: 3,
            overflow: 'hidden',
            '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'grey.50',
                fontWeight: 700,
                fontSize: '0.9rem'
            },
            '& .MuiDataGrid-row:hover': {
                backgroundColor: 'action.hover'
            }
        }}>
            <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end', bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                <Tooltip title="Refresh Data">
                    <IconButton onClick={fetchDeliveries} size="small">
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
            </Box>
            <DataGrid
                rows={filteredDeliveries}
                columns={columns}
                loading={isLoading}
                getRowId={(row) => row._id}
                initialState={{
                sorting: { sortModel: [{ field: 'date', sort: 'desc' }] },
                pagination: { paginationModel: { pageSize: 10 } },
                }}
                pageSizeOptions={[10, 25, 50]}
                disableRowSelectionOnClick
                sx={{ border: 'none' }}
            />
        </Paper>
      </motion.div>

      {/* --- View Details Modal --- */}
      <AnimatePresence>
        {selectedDelivery && (
          <Dialog 
            open={!!selectedDelivery} 
            onClose={() => setSelectedDelivery(null)} 
            fullWidth 
            maxWidth="md"
            PaperComponent={motion.div}
            PaperProps={{
              initial: { y: 20, opacity: 0, scale: 0.95 },
              animate: { y: 0, opacity: 1, scale: 1 },
              exit: { y: 20, opacity: 0, scale: 0.95 },
              transition: { duration: 0.2 },
              sx: { 
                borderRadius: 3, 
                overflow: 'hidden',
                bgcolor: 'background.paper', // Added: Fixes transparency
                boxShadow: 24 // Added: Restores shadow depth
              }
            }}
          >
            <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 700 }}>
                Delivery Details
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
                <Box sx={{ mb: 3 }}>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Supplier</Typography>
                      <Typography variant="h6" fontWeight={700}>{selectedDelivery.supplier?.name || 'N/A'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Origin</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {selectedDelivery.purchaseOrder
                            ? <Chip label={`PO #${selectedDelivery.purchaseOrder.poNumber}`} color="primary" variant="outlined" size="small" sx={{ fontWeight: 600 }} />
                            : <Chip label="Direct Delivery" color="secondary" variant="outlined" size="small" sx={{ fontWeight: 600 }} />
                        }
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">Type</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip 
                            label={selectedDelivery.deliveryType || 'Purchase'} 
                            color={selectedDelivery.deliveryType === 'Consignment' ? 'info' : 'default'} 
                            variant="filled"
                            size="small"
                            sx={{ fontWeight: 600 }}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
                
                <Divider sx={{ mb: 2 }} />
                
                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <LocalShippingIcon sx={{ mr: 1, color: 'text.secondary' }} /> Products Received
                </Typography>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell sx={{ fontWeight: 700 }}>Product Name</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Qty</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Cost (ea)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {selectedDelivery.productsReceived.map(item => (
                            <TableRow key={item.product?._id || item._id} hover> 
                                <TableCell sx={{ fontWeight: 500 }}>{item.product?.name || 'Unknown Product'}</TableCell>
                                <TableCell align="right">{item.quantity}</TableCell>
                                <TableCell align="right">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(item.costAtTime)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Button onClick={() => setSelectedDelivery(null)} variant="outlined" sx={{ fontWeight: 600 }}>Close</Button>
            </DialogActions>
          </Dialog>
        )}
      </AnimatePresence>

      {/* --- Add Delivery Modal --- */}
      <AnimatePresence>
        {isDeliveryModalOpen && (
          <Dialog
            open={isDeliveryModalOpen}
            onClose={() => setIsDeliveryModalOpen(false)}
            fullWidth
            maxWidth="md"
            PaperComponent={motion.div}
            PaperProps={{
              initial: { y: 20, opacity: 0, scale: 0.95 },
              animate: { y: 0, opacity: 1, scale: 1 },
              exit: { y: 20, opacity: 0, scale: 0.95 },
              transition: { duration: 0.2 },
              sx: { 
                borderRadius: 3, 
                overflow: 'hidden',
                bgcolor: 'background.paper', // Added: Fixes transparency
                boxShadow: 24 // Added: Restores shadow depth
              }
            }}
          >
            <DialogTitle sx={{ bgcolor: 'success.main', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocalShippingIcon /> Record New Direct Delivery
            </DialogTitle>
            <DialogContent sx={{ p: 0 }}>
                <Box sx={{ p: 3 }}>
                    <RecordDeliveryForm onClose={handleDeliveryFormClose} />
                </Box>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

    </Container>
  );
};

export default DeliveriesPage;