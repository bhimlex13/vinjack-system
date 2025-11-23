// client/src/components/reports/PayoutHistory.js
import React, { useState, useEffect, useMemo } from 'react';
import { getPayoutHistory } from '../../api/consignmentApi';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion'; // --- NEW IMPORT ---

// MUI Imports
import {
  Paper, Box, Alert, TextField, InputAdornment, 
  FormControl, InputLabel, Select, MenuItem, Typography
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';

// --- NEW IMPORT ---
import LoadingSpinner from '../LoadingSpinner';

// Helper to format currency
const formatCurrency = (value) => 
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

// Helper to format dates
const formatDateTime = (dateString) => 
  dateString ? new Date(dateString).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'N/A';

const PayoutHistory = () => {
  const [payables, setPayables] = useState([]);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');

  // --- FRAMER MOTION VARIANTS ---
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };
  // ------------------------------

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const data = await getPayoutHistory();
        setPayables(data);

        const suppliers = new Map();
        data.forEach(p => {
          if (p.supplier) {
            suppliers.set(p.supplier._id, p.supplier.name);
          }
        });
        setAllSuppliers(Array.from(suppliers, ([_id, name]) => ({ _id, name })));
        
        setError('');
      } catch (err) {
        setError('Failed to fetch payout history.');
        toast.error('Failed to fetch payout history.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHistory();
  }, []);

  const filteredPayables = useMemo(() => {
    return payables.filter(p => {
      const supplierMatch = filterSupplier ? p.supplier?._id === filterSupplier : true;
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const searchMatch = !searchTerm ||
        (p.product?.name?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (p.product?.itemCode?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (p.supplier?.name?.toLowerCase().includes(lowerCaseSearchTerm));
      return supplierMatch && searchMatch;
    });
  }, [payables, searchTerm, filterSupplier]);

  const columns = [
    {
      field: 'paidDate', headerName: 'Date Paid', flex: 1, minWidth: 180,
      valueGetter: (value, row) => new Date(row.paidDate),
      renderCell: (params) => formatDateTime(params.value),
    },
    { 
      field: 'supplier', headerName: 'Supplier', flex: 1.5, minWidth: 200,
      valueGetter: (value, row) => row.supplier?.name || 'N/A'
    },
    { 
      field: 'product', headerName: 'Product', flex: 1.5, minWidth: 220,
      valueGetter: (value, row) => `${row.product?.name} (${row.product?.itemCode})`
    },
    { 
      field: 'quantitySold', headerName: 'Qty', type: 'number', width: 80, align: 'center', headerAlign: 'center',
    },
    {
      field: 'amountOwed', headerName: 'Amount Paid', type: 'number', flex: 0.5, minWidth: 120,
      renderCell: (params) => (
        <Typography fontWeight="bold" color="success.main">
          {formatCurrency(params.value)}
        </Typography>
      )
    },
    {
      field: 'saleDate', headerName: 'Date Sold', flex: 1, minWidth: 180,
      valueGetter: (value, row) => new Date(row.sale?.createdAt || row.createdAt),
      renderCell: (params) => formatDateTime(params.value),
    },
  ];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <LoadingSpinner text="Loading History..." />
      </Box>
    );
  }

  return (
    <Box component={motion.div} variants={containerVariants} initial="hidden" animate="visible">
      {/* --- Filter and Search Bar --- */}
      <Paper sx={{ p: 2, my: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          label="Search by Product or Supplier"
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
            {allSuppliers.map(sup => (
              <MenuItem key={sup._id} value={sup._id}>{sup.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ height: '65vh', width: '100%' }}>
        <DataGrid
          rows={filteredPayables}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row._id}
          initialState={{
            sorting: { sortModel: [{ field: 'paidDate', sort: 'desc' }] },
          }}
          sx={{ '& .MuiDataGrid-cell': { py: 1 } }}
        />
      </Paper>
    </Box>
  );
};

export default PayoutHistory;