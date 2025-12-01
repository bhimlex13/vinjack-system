// client/src/pages/TransactionsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import ReceiptModal from '../components/ReceiptModal';
import UploadReceiptModal from '../components/UploadReceiptModal';
import ImageViewModal from '../components/ImageViewModal';
import { searchSales } from '../api/saleApi';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';
import { motion } from 'framer-motion';

// MUI Imports
import {
  Box, Button, Typography, Paper, Container, Grid, TextField, FormControl,
  InputLabel, Select, MenuItem, Alert, IconButton, Tooltip, ButtonGroup, Chip
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import ImageIcon from '@mui/icons-material/Image';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FilterAltIcon from '@mui/icons-material/FilterAlt';

const TransactionsPage = () => {
  const today = new Date().toISOString().split('T')[0];

  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [uploadSaleId, setUploadSaleId] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isImageViewOpen, setIsImageViewOpen] = useState(false);
  const [imageViewUrl, setImageViewUrl] = useState('');

  // State for filters
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [datePreset, setDatePreset] = useState('today');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterUser, setFilterUser] = useState('');

  // Animation
  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  // Fetch data for filter dropdowns
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const [customersRes, usersRes] = await Promise.all([
          api.get('/customers'),
          api.get('/users')
        ]);
        setCustomers(customersRes.data);
        setUsers(usersRes.data.filter(u => u.status === 'active'));
      } catch (err) {
        console.error("Failed to fetch filter data", err);
        setError("Could not load filter options.");
      }
    };
    fetchFilterData();
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const sDate = startDate || today;
      const eDate = endDate || today;
      
      if (sDate > eDate) {
          setSales([]);
          return;
      }

      const responseData = await searchSales({
        startDate: sDate, endDate: eDate, customerId: filterCustomer, userId: filterUser
      });
      setSales(responseData || []);
    } catch (err) {
      setError('Failed to fetch transaction data.');
      console.error(err);
      setSales([]);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, filterCustomer, filterUser, today]);

  useEffect(() => {
    handleGenerate();
  }, [handleGenerate]);

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
  };

  const handleOpenUploadModal = (saleId) => {
    setUploadSaleId(saleId);
    setIsUploadModalOpen(true);
  };

  const handleUploadSuccess = (updatedSale) => {
    setSales(prevSales =>
        prevSales.map(sale =>
            sale._id === updatedSale._id ? updatedSale : sale 
        )
    );
    if (selectedSale && selectedSale._id === updatedSale._id) {
        setSelectedSale(updatedSale);
    }
    if (isImageViewOpen && uploadSaleId === updatedSale._id) {
        if (updatedSale.customerReceiptImage && updatedSale.customerReceiptImage.startsWith('data:image')) { 
            setImageViewUrl(updatedSale.customerReceiptImage);
        } else { 
            const imageBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            setImageViewUrl(updatedSale.customerReceiptImage ? `${imageBaseUrl}${updatedSale.customerReceiptImage}` : '');
        }
    }
  };

  const handleOpenImageView = (imageUrl) => {
    if (!imageUrl) return;
    if (imageUrl.startsWith('data:image')) { 
      setImageViewUrl(imageUrl);
    } else {
      const imageBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      setImageViewUrl(`${imageBaseUrl}${imageUrl}`);
    }
    setIsImageViewOpen(true);
  };

  const columns = [ 
    {
      field: 'createdAt', 
      headerName: 'Date', 
      width: 230, 
      renderCell: (params) => params?.value ? (
        <Typography variant="body2" sx={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', height: '100%' }}>
            <Box component="span" fontWeight={600}>
                {new Date(params.value).toLocaleDateString()}
            </Box>
            <Box component="span" color="text.secondary" sx={{ ml: 1, fontSize: '0.85rem' }}>
                {new Date(params.value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Box>
        </Typography>
      ) : 'N/A',
    },
    { field: '_id', headerName: 'Sale ID', width: 220 },
    { field: 'customer', headerName: 'Customer', width: 180, valueGetter: (params) => params?.row?.customer?.name || 'Walk-in' },
    { field: 'recordedBy', headerName: 'Cashier', width: 150, renderCell: (params) => <Chip label={params?.row?.recordedBy?.fullName || 'N/A'} size="small" variant="outlined" /> }, 
    
    // Total Amount Column
    { 
      field: 'totalAmount', 
      headerName: 'Total Amount', 
      width: 150, 
      type: 'number', 
      align: 'center',       
      headerAlign: 'center', 
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
            <Typography fontWeight={700} color="primary.main">
                {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(params.row?.totalAmount ?? 0)}
            </Typography>
        </Box>
      ) 
    }, 

    { field: 'actions', headerName: 'Actions', width: 180, sortable: false, align: 'center', headerAlign: 'center',
      renderCell: (params) => {
        if (!params?.row) { return null; }
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
            <Tooltip title="View Receipt">
                <IconButton color="primary" size="small" onClick={() => setSelectedSale(params.row)}>
                    <VisibilityIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <Tooltip title={params.row.customerReceiptImage ? "Replace Receipt Image" : "Upload Receipt Image"}>
                <IconButton color="secondary" size="small" onClick={() => handleOpenUploadModal(params.row._id)}>
                    <FileUploadIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <Tooltip title="View Uploaded Receipt">
                <span>
                    <IconButton color="info" size="small" onClick={() => handleOpenImageView(params.row.customerReceiptImage)} disabled={!params.row.customerReceiptImage}>
                        <ImageIcon fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>
          </Box>
        );
      }
    }
  ];

  return (
    <Container maxWidth="xl" sx={{ pb: 4 }}>
      <motion.div initial="hidden" animate="visible" variants={pageVariants}>
        
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'secondary.light', color: 'secondary.dark', mr: 2, boxShadow: 2 }}>
                <ReceiptLongIcon fontSize="large" />
            </Box>
            <Box>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
                Transaction Log
                </Typography>
                <Typography variant="body2" color="text.secondary">
                Review and manage completed sales history
                </Typography>
            </Box>
        </Box>
      
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FilterAltIcon color="action" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight={700}>Filters</Typography>
            </Box>
            <Grid container spacing={2} alignItems="center">
            
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

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField fullWidth label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField fullWidth label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth size="small">
                <InputLabel>Customer</InputLabel>
                <Select value={filterCustomer} label="Customer" onChange={(e) => setFilterCustomer(e.target.value)}>
                    <MenuItem value=""><em>All Customers</em></MenuItem>
                    {customers.map(c => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
                </Select>
                </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth size="small">
                <InputLabel>Cashier</InputLabel>
                <Select value={filterUser} label="Cashier" onChange={(e) => setFilterUser(e.target.value)}>
                    <MenuItem value=""><em>All Cashiers</em></MenuItem>
                    {users.map(u => <MenuItem key={u._id} value={u._id}>{u.fullName}</MenuItem>)}
                </Select>
                </FormControl>
            </Grid>
            </Grid>
        </Paper>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Paper sx={{ height: 600, width: '100%', borderRadius: 3, boxShadow: 3, overflow: 'hidden' }}>
            <DataGrid 
                rows={sales} 
                columns={columns} 
                loading={isLoading} 
                getRowId={(row) => row._id} 
                initialState={{ 
                    sorting: { sortModel: [{ field: 'createdAt', sort: 'desc' }] },
                    pagination: { paginationModel: { pageSize: 10 } }
                }} 
                pageSizeOptions={[10, 25, 50]}
                disableRowSelectionOnClick
                sx={{
                    border: 0,
                    '& .MuiDataGrid-columnHeaders': {
                        backgroundColor: 'grey.50',
                        fontWeight: 700,
                    },
                    '& .MuiDataGrid-row:hover': {
                        backgroundColor: 'action.hover'
                    }
                }}
            />
        </Paper>

        {selectedSale && (<ReceiptModal open={Boolean(selectedSale)} saleData={selectedSale} onClose={() => setSelectedSale(null)} onViewImage={handleOpenImageView} />)}
        {isUploadModalOpen && (<UploadReceiptModal open={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} saleId={uploadSaleId} onUploadSuccess={handleUploadSuccess} />)}
        <ImageViewModal open={isImageViewOpen} onClose={() => setIsImageViewOpen(false)} imageUrl={imageViewUrl} />
      </motion.div>
    </Container>
  );
};

export default TransactionsPage;