// client/src/pages/DeliveriesPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getDeliveries } from '../api/deliveryApi';
import RecordDeliveryForm from '../components/RecordDeliveryForm';
import { motion, AnimatePresence } from 'framer-motion';
// --- MODIFIED: Date Imports ---
import { startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';
// --- END MODIFICATION ---

// MUI Imports
import { 
  Box, Button, Typography, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, Table, TableBody, TableCell, TableHead, TableRow, Chip,
  Grid, Divider, Stack, Container, TextField, InputAdornment, FormControl,
  InputLabel, Select, MenuItem, Tooltip, ButtonGroup // --- MODIFIED: Added ButtonGroup ---
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SearchIcon from '@mui/icons-material/Search';

import LoadingSpinner from '../components/LoadingSpinner';

const DeliveriesPage = () => {
  const today = new Date().toISOString().split('T')[0]; // --- NEW ---

  const [deliveries, setDeliveries] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  
  // --- MODIFIED: Date Filter State ---
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [datePreset, setDatePreset] = useState('today');
  // --- END MODIFICATION ---

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

  // --- MODIFIED: Date Preset Handler ---
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
  // --- END MODIFICATION ---

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(delivery => {
      // --- MODIFIED: Add Date Logic ---
      const deliveryDate = new Date(delivery.deliveryDate || delivery.createdAt);
      
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const dateMatch = deliveryDate >= start && deliveryDate <= end;
      // --- END MODIFICATION ---

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
      renderCell: (params) => params.value ? params.value.toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      }) : 'N/A',
    },
    { 
      field: 'supplier', headerName: 'Supplier', flex: 1, minWidth: 180,
      valueGetter: (value, row) => row.supplier?.name || 'N/A'
    },
    {
      field: 'purchaseOrder', headerName: 'Origin', flex: 1, minWidth: 150,
      sortable: false,
      renderCell: (params) => params.row.purchaseOrder 
        ? <Chip label={`PO: ${params.row.purchaseOrder.poNumber}`} color="primary" variant="outlined" size="small" /> 
        : <Chip label="Direct Delivery" color="secondary" variant="outlined" size="small" />
    },
    {
      field: 'deliveryType', headerName: 'Type', flex: 0.5, minWidth: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value || 'Purchase'} 
          color={params.value === 'Consignment' ? 'info' : 'default'} 
          variant="filled" 
          size="small" 
        />
      )
    },
    {
      field: 'recordedBy', headerName: 'Recorded By', flex: 1, minWidth: 180,
      valueGetter: (value, row) => row.recordedBy?.fullName || 'N/A'
    },
    {
      field: 'actions', headerName: 'Actions', width: 150, sortable: false, align: 'center', headerAlign: 'center',
      renderCell: (params) => (
        <Tooltip title="View Details">
            <Button variant="outlined" size="small" onClick={() => setSelectedDelivery(params.row)}>
              View
            </Button>
        </Tooltip>
      )
    }
  ];

  if (error) return <Typography color="error" sx={{ p: 3 }}>{error}</Typography>;

  if (isLoading && deliveries.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <LoadingSpinner text="Loading Deliveries..." />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ p: 3, mt: 2 }}>
      
      <motion.div initial="hidden" animate="visible" variants={pageVariants}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                  Deliveries Hub
              </Typography>
              <Typography variant="body1" color="text.secondary">
                  Log direct deliveries or create new purchase orders.
              </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
              <Button 
                  variant="contained" 
                  color="success"
                  startIcon={<LocalShippingIcon />}
                  onClick={() => setIsDeliveryModalOpen(true)}
              >
                  Record Direct Delivery
              </Button>
              <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/purchase-orders/new')}
              >
                  Create Purchase Order
              </Button>
          </Stack>
        </Box>

        {/* --- MODIFIED: Date Filter Paper --- */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item size={{ xs: 12 }}>
              <ButtonGroup fullWidth variant="outlined" aria-label="date range presets">
                <Button variant={datePreset === 'today' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('today')}>Today</Button>
                <Button variant={datePreset === 'week' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('week')}>This Week</Button>
                <Button variant={datePreset === 'month' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('month')}>This Month</Button>
                <Button variant={datePreset === 'year' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('year')}>This Year</Button>
                <Button variant={datePreset === 'all' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('all')}>All Time</Button>
              </ButtonGroup>
            </Grid>
            <Grid item size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
            </Grid>
            <Grid item size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
            </Grid>
          </Grid>
        </Paper>
        {/* --- END MODIFICATION --- */}

        <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Search by Supplier, PO Number, or Type"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Filter by Supplier</InputLabel>
            <Select
              value={filterSupplier}
              label="Filter by Supplier"
              onChange={(e) => setFilterSupplier(e.target.value)}
            >
              <MenuItem value=""><em>All Suppliers</em></MenuItem>
              {suppliers.map(sup => (
                <MenuItem key={sup._id} value={sup._id}>{sup.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        <Paper sx={{ height: '70vh', width: '100%' }}>
          <DataGrid
            rows={filteredDeliveries}
            columns={columns}
            loading={isLoading}
            getRowId={(row) => row._id}
            initialState={{
              sorting: { sortModel: [{ field: 'date', sort: 'desc' }] },
            }}
          />
        </Paper>
      </motion.div>

      <AnimatePresence>
        {selectedDelivery && (
          <Dialog 
            open={!!selectedDelivery} 
            onClose={() => setSelectedDelivery(null)} 
            fullWidth 
            maxWidth="md"
            PaperComponent={motion.div}
            PaperProps={{
              initial: { y: 50, opacity: 0 },
              animate: { y: 0, opacity: 1 },
              exit: { y: 50, opacity: 0 },
              transition: { duration: 0.3 },
              sx: { backgroundColor: 'background.paper', boxShadow: 24, borderRadius: 2 }
            }}
          >
            <DialogTitle>Delivery Details</DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">Supplier</Typography>
                      <Typography variant="h6" component="p">{selectedDelivery.supplier?.name || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">Origin</Typography>
                      <Typography variant="h6" component="p">
                        {selectedDelivery.purchaseOrder
                          ? `Purchase Order #${selectedDelivery.purchaseOrder.poNumber}`
                          : 'Direct Delivery'
                        }
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary">Delivery Type</Typography>
                      <Typography variant="h6" component="p">
                        <Chip 
                          label={selectedDelivery.deliveryType || 'Purchase'} 
                          color={selectedDelivery.deliveryType === 'Consignment' ? 'info' : 'default'} 
                          variant="filled"
                        />
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>Products Received</Typography>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Product Name</TableCell>
                            <TableCell align="right">Quantity Received</TableCell>
                            <TableCell align="right">Cost at Time</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {selectedDelivery.productsReceived.map(item => (
                            <TableRow key={item.product?._id || item._id}> 
                                <TableCell>{item.product?.name || 'Unknown Product'}</TableCell>
                                <TableCell align="right">{item.quantity}</TableCell>
                                <TableCell align="right">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(item.costAtTime)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setSelectedDelivery(null)}>Close</Button>
            </DialogActions>
          </Dialog>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeliveryModalOpen && (
          <Dialog
            open={isDeliveryModalOpen}
            onClose={() => setIsDeliveryModalOpen(false)}
            fullWidth
            maxWidth="md"
            PaperComponent={motion.div}
            PaperProps={{
              initial: { y: 50, opacity: 0 },
              animate: { y: 0, opacity: 1 },
              exit: { y: 50, opacity: 0 },
              transition: { duration: 0.3 },
              sx: { backgroundColor: 'background.paper', boxShadow: 24, borderRadius: 2 }
            }}
          >
            <DialogTitle>Record New Direct Delivery</DialogTitle>
            <DialogContent>
              <RecordDeliveryForm onClose={handleDeliveryFormClose} />
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

    </Container>
  );
};

export default DeliveriesPage;