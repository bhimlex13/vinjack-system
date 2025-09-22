// client/src/pages/TransactionsPage.js
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import ReceiptModal from '../components/ReceiptModal';

// MUI Imports
import {
  Box, Button, Typography, Paper, Container, Grid, TextField, FormControl,
  InputLabel, Select, MenuItem, Alert, CircularProgress
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

const TransactionsPage = () => {
  const today = new Date().toISOString().split('T')[0];

  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);

  // State for filters
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [startDate, setStartDate] = useState(today); // --- Set initial start date to today ---
  const [endDate, setEndDate] = useState(today);   // --- Set initial end date to today ---
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
        setUsers(usersRes.data);
      } catch (err) {
        console.error("Failed to fetch filter data", err);
        setError("Could not load filter options.");
      }
    };
    fetchFilterData();
  }, []);

  // --- Fetch today's sales on initial page load ---
  useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      // Use today's date if the fields are cleared, otherwise use the selected dates
      const sDate = startDate || today;
      const eDate = endDate || today;

      params.append('startDate', sDate);
      params.append('endDate', eDate);
      if (filterCustomer) params.append('customerId', filterCustomer);
      if (filterUser) params.append('userId', filterUser);

      const response = await api.get(`/reports/sales?${params.toString()}`);
      setSales(response.data);
    } catch (err) {
      setError('Failed to fetch transaction data.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    {
      field: 'createdAt', headerName: 'Date', flex: 1, minWidth: 200,
      renderCell: (params) => new Date(params.value).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      }),
    },
    { field: '_id', headerName: 'Sale ID', flex: 1, minWidth: 220 },
    {
      field: 'customer', headerName: 'Customer', flex: 1, minWidth: 180,
      renderCell: (params) => params.row.customer?.name || 'Walk-in'
    },
    {
      field: 'recordedBy', headerName: 'Cashier', flex: 1, minWidth: 180,
      renderCell: (params) => params.row.recordedBy?.fullName || 'N/A'
    },
    {
      field: 'totalAmount', headerName: 'Total Amount', flex: 1, minWidth: 150, type: 'number', align: 'right', headerAlign: 'right',
      renderCell: (params) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(params.row.totalAmount),
    },
    {
      field: 'actions', headerName: 'Actions', width: 150, sortable: false, align: 'center', headerAlign: 'center',
      renderCell: (params) => (
        <Button variant="outlined" size="small" onClick={() => setSelectedSale(params.row)}>
          View Receipt
        </Button>
      )
    }
  ];

  return (
    <Container maxWidth="xl" sx={{ p: 3, mt: 2 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
        Transaction Log
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Filter and review all completed sales transactions.
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item size={{ xs: 12, md: 2.5 }}>
            <TextField fullWidth label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
          </Grid>
          <Grid item size={{ xs: 12, md: 2.5 }}>
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
          <Grid item size={{ xs: 12, md: 1 }}>
            <Button fullWidth variant="contained" onClick={handleGenerate} disabled={isLoading}>
              {isLoading ? <CircularProgress size={24} /> : 'Find'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Paper sx={{ height: '70vh', width: '100%' }}>
        <DataGrid
          rows={sales}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row._id}
          initialState={{ sorting: { sortModel: [{ field: 'createdAt', sort: 'desc' }] } }}
        />
      </Paper>

      {selectedSale && (
        <ReceiptModal
          saleData={selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </Container>
  );
};

export default TransactionsPage;