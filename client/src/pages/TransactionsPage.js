// client/src/pages/TransactionsPage.js
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import ReceiptModal from '../components/ReceiptModal';
import UploadReceiptModal from '../components/UploadReceiptModal'; // Make sure this path is correct
import ImageViewModal from '../components/ImageViewModal';
import { searchSales } from '../api/saleApi';

// MUI Imports
import {
  Box, Button, Typography, Paper, Container, Grid, TextField, FormControl,
  InputLabel, Select, MenuItem, Alert, CircularProgress,
  IconButton, Tooltip
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

  // Fetch sales based on initial date range
  useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    try {
      const sDate = startDate || today;
      const eDate = endDate || today;
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
  };

  const handleOpenUploadModal = (saleId) => {
    setUploadSaleId(saleId);
    setIsUploadModalOpen(true);
  };

  // --- MODIFIED: Expects the full updated sale object ---
  const handleUploadSuccess = (updatedSale) => {
    // Update the sales list with the new sale data
    setSales(prevSales =>
        prevSales.map(sale =>
            sale._id === updatedSale._id ? updatedSale : sale // Use _id
        )
    );
    // If the currently viewed receipt modal is for this sale, update it too
    if (selectedSale && selectedSale._id === updatedSale._id) {
        setSelectedSale(updatedSale); // Use _id
    }
    // If the image view modal is open for this sale, update the image URL/string
    if (isImageViewOpen && uploadSaleId === updatedSale._id) {
        // Use the updated image string directly if it's base64
        if (updatedSale.customerReceiptImage && updatedSale.customerReceiptImage.startsWith('data:image')) { // Check if it's base64
            setImageViewUrl(updatedSale.customerReceiptImage);
        } else { // Otherwise, assume it's a path (for backward compatibility if needed)
            const imageBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            setImageViewUrl(updatedSale.customerReceiptImage ? `${imageBaseUrl}${updatedSale.customerReceiptImage}` : '');
        }
    }
  };
  // --- END MODIFICATION ---

  // --- MODIFIED: Handle Base64 strings ---
  const handleOpenImageView = (imageUrl) => {
    if (!imageUrl) return;

    // Check if it's a Base64 string or a URL path
    if (imageUrl.startsWith('data:image')) { // Check if it's base64
      // It's a Base64 string, use it directly
      setImageViewUrl(imageUrl);
    } else {
      // It's a path (maybe from old uploads), build the full URL
      const imageBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      setImageViewUrl(`${imageBaseUrl}${imageUrl}`);
    }
    setIsImageViewOpen(true);
  };
  // --- END MODIFICATION ---

  const columns = [ // Columns definition uses renderCell directly
    {
      field: 'createdAt', headerName: 'Date', width: 170,
      renderCell: (params) => params?.value ? new Date(params.value).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A',
    },
    { field: '_id', headerName: 'Sale ID', width: 220 },
    { field: 'customer', headerName: 'Customer', width: 180, valueGetter: (params) => params?.row?.customer?.name || 'Walk-in' },
    { field: 'recordedBy', headerName: 'Cashier', width: 180, renderCell: (params) => params?.row?.recordedBy?.fullName || 'N/A' }, // Directly render from row data
    { field: 'totalAmount', headerName: 'Total Amount', width: 150, type: 'number', align: 'right', headerAlign: 'right', renderCell: (params) => { const amount = params.row?.totalAmount ?? 0; return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount); } }, // Directly render from row data
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

  return ( // The JSX structure remains the same
    <Container maxWidth="xl" sx={{ p: 3, mt: 2 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>Transaction Log</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>Filter and review all completed sales transactions.</Typography>
      <Paper sx={{ p: 2, mb: 3 }}><Grid container spacing={2} alignItems="center">
          <Grid item size={{ xs: 12, md: 2.5 }}><TextField fullWidth label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" /></Grid>
          <Grid item size={{ xs: 12, md: 2.5 }}><TextField fullWidth label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" /></Grid>
          <Grid item size={{ xs: 12, md: 3 }}><FormControl fullWidth size="small"><InputLabel>Filter by Customer</InputLabel><Select value={filterCustomer} label="Filter by Customer" onChange={(e) => setFilterCustomer(e.target.value)}><MenuItem value=""><em>All Customers</em></MenuItem>{customers.map(c => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item size={{ xs: 12, md: 3 }}><FormControl fullWidth size="small"><InputLabel>Filter by Cashier</InputLabel><Select value={filterUser} label="Filter by Cashier" onChange={(e) => setFilterUser(e.target.value)}><MenuItem value=""><em>All Cashiers</em></MenuItem>{users.map(u => <MenuItem key={u._id} value={u._id}>{u.fullName}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item size={{ xs: 12, md: 1 }}><Button fullWidth variant="contained" onClick={handleGenerate} disabled={isLoading}>{isLoading ? <CircularProgress size={24} /> : 'Find'}</Button></Grid>
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