// client/src/pages/TransactionsPage.js
import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import api from '../api/axios';
import ReceiptModal from '../components/ReceiptModal';
import UploadReceiptModal from '../components/UploadReceiptModal';
import ImageViewModal from '../components/ImageViewModal';
import { searchSales } from '../api/saleApi';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';

// MUI Imports
import {
  Box, Button, Typography, Paper, Container, Grid, TextField, FormControl,
  InputLabel, Select, MenuItem, Alert,
  IconButton, Tooltip, ButtonGroup 
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import ImageIcon from '@mui/icons-material/Image';

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

  // --- MODIFIED: Wrapped handleGenerate in useCallback ---
  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const sDate = startDate || today;
      const eDate = endDate || today;
      
      // If end date is before start date, don't fetch (or swap them, but skipping is safer)
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
  // --- END MODIFICATION ---

  // --- MODIFIED: Auto-trigger fetch when filters change ---
  useEffect(() => {
    handleGenerate();
  }, [handleGenerate]); // Dependencies are inside handleGenerate (startDate, endDate, filters)
  // --- END MODIFICATION ---

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
      field: 'createdAt', headerName: 'Date', width: 170,
      renderCell: (params) => params?.value ? new Date(params.value).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A',
    },
    { field: '_id', headerName: 'Sale ID', width: 220 },
    { field: 'customer', headerName: 'Customer', width: 180, valueGetter: (params) => params?.row?.customer?.name || 'Walk-in' },
    { field: 'recordedBy', headerName: 'Cashier', width: 180, renderCell: (params) => params?.row?.recordedBy?.fullName || 'N/A' }, 
    { field: 'totalAmount', headerName: 'Total Amount', width: 150, type: 'number', align: 'right', headerAlign: 'right', renderCell: (params) => { const amount = params.row?.totalAmount ?? 0; return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount); } }, 
    { field: 'actions', headerName: 'Actions', width: 200, sortable: false, align: 'center', headerAlign: 'center',
      renderCell: (params) => {
        if (!params?.row) { return null; }
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Tooltip title="View Details"><Button variant="outlined" size="small" onClick={() => setSelectedSale(params.row)} sx={{ mr: 0.5 }}>View</Button></Tooltip>
            <Tooltip title={params.row.customerReceiptImage ? "Replace Receipt Image" : "Upload Receipt Image"}><span><IconButton size="small" color="secondary" onClick={() => handleOpenUploadModal(params.row._id)}><FileUploadIcon /></IconButton></span></Tooltip>
            <Tooltip title="View Uploaded Receipt"><span><IconButton size="small" color="info" onClick={() => handleOpenImageView(params.row.customerReceiptImage)} disabled={!params.row.customerReceiptImage}><ImageIcon /></IconButton></span></Tooltip>
          </Box>
        );
      }
    }
  ];

  return (
    <Container maxWidth="xl" sx={{ p: 3, mt: 2 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>Transaction Log</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>Filter and review all completed sales transactions.</Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
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

          {/* --- MODIFIED: Adjusted Grid sizes to fill space (3+3+3+3 = 12) --- */}
          <Grid item size={{ xs: 12, md: 3 }}>
            <TextField fullWidth label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
          </Grid>
          <Grid item size={{ xs: 12, md: 3 }}>
            <TextField fullWidth label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
          </Grid>
          <Grid item size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Customer</InputLabel>
              <Select value={filterCustomer} label="Filter by Customer" onChange={(e) => setFilterCustomer(e.target.value)}>
                <MenuItem value=""><em>All Customers</em></MenuItem>
                {customers.map(c => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Cashier</InputLabel>
              <Select value={filterUser} label="Filter by Cashier" onChange={(e) => setFilterUser(e.target.value)}>
                <MenuItem value=""><em>All Cashiers</em></MenuItem>
                {users.map(u => <MenuItem key={u._id} value={u._id}>{u.fullName}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          {/* --- END MODIFICATION: Removed the Find Button Grid --- */}

      </Grid></Paper>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ height: '70vh', width: '100%' }}><DataGrid rows={sales} columns={columns} loading={isLoading} getRowId={(row) => row._id} initialState={{ sorting: { sortModel: [{ field: 'createdAt', sort: 'desc' }] } }} density="compact" /></Paper>
      {selectedSale && (<ReceiptModal saleData={selectedSale} onClose={() => setSelectedSale(null)} onViewImage={handleOpenImageView} />)}
      {isUploadModalOpen && (<UploadReceiptModal open={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} saleId={uploadSaleId} onUploadSuccess={handleUploadSuccess} />)}
      <ImageViewModal open={isImageViewOpen} onClose={() => setIsImageViewOpen(false)} imageUrl={imageViewUrl} />
    </Container>
  );
};

export default TransactionsPage;