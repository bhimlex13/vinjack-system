// client/src/pages/ConsignmentPayoutsPage.js
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { getOwedPayables, markPayableAsPaid } from '../api/consignmentApi';
import ConfirmationContext from '../context/ConfirmationContext';
import { toast } from 'react-toastify';
import PayoutHistory from '../components/reports/PayoutHistory';
import { motion, AnimatePresence } from 'framer-motion'; 
import { startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';

import {
  Container, Typography, Paper, Box, Alert, Tooltip, IconButton,
  TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem,
  Tabs, Tab, Grid, Button, ButtonGroup
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PaymentIcon from '@mui/icons-material/Payment';
import HistoryIcon from '@mui/icons-material/History';

import LoadingSpinner from '../components/LoadingSpinner';

// Helper to format currency
const formatCurrency = (value) => 
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

// Helper to format dates
const formatDateTime = (dateString) => 
  dateString ? new Date(dateString).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'N/A';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`payout-tabpanel-${index}`}
      aria-labelledby={`payout-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const OwedPayouts = () => {
  const today = new Date().toISOString().split('T')[0];

  const [payables, setPayables] = useState([]);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  
  // --- Date Filter State ---
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [datePreset, setDatePreset] = useState('today');

  const { confirm } = useContext(ConfirmationContext);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };

  const fetchPayables = async () => {
    try {
      setIsLoading(true);
      const data = await getOwedPayables();
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
      setError('Failed to fetch consignment payables.');
      toast.error('Failed to fetch consignment payables.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayables();
  }, []);

  // --- Date Preset Handler ---
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

  const handleMarkAsPaid = async (payable) => {
    const isConfirmed = await confirm(
      'Confirm Payment',
      `Mark ₱${payable.amountOwed.toFixed(2)} owed to ${payable.supplier.name} for ${payable.product.name} (Sold on: ${formatDateTime(payable.sale.createdAt)}) as PAID?`
    );

    if (isConfirmed) {
      try {
        await markPayableAsPaid(payable._id);
        toast.success('Payable marked as paid!');
        setPayables(prevPayables => prevPayables.filter(p => p._id !== payable._id));
      } catch (err) {
        toast.error(err.message || 'Failed to mark as paid.');
        console.error(err);
      }
    }
  };

  const filteredPayables = useMemo(() => {
    return payables.filter(p => {
      // --- Filter Logic ---
      const saleDate = new Date(p.sale?.createdAt || p.createdAt);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const dateMatch = saleDate >= start && saleDate <= end;

      const supplierMatch = filterSupplier ? p.supplier?._id === filterSupplier : true;
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const searchMatch = !searchTerm ||
        (p.product?.name?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (p.product?.itemCode?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (p.supplier?.name?.toLowerCase().includes(lowerCaseSearchTerm));
      
      return supplierMatch && searchMatch && dateMatch;
    });
  }, [payables, searchTerm, filterSupplier, startDate, endDate]);
  
  const totalOwed = useMemo(() => {
    return filteredPayables.reduce((sum, p) => sum + p.amountOwed, 0);
  }, [filteredPayables]);

  const columns = [
    {
      field: 'saleDate', headerName: 'Date Sold', flex: 1, minWidth: 180,
      valueGetter: (value, row) => new Date(row.sale?.createdAt || row.createdAt),
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
      field: 'costAtTimeOfSale', headerName: 'Unit Cost', type: 'number', flex: 0.5, minWidth: 100,
      renderCell: (params) => formatCurrency(params.value)
    },
    {
      field: 'amountOwed', headerName: 'Amount Owed', type: 'number', flex: 0.5, minWidth: 120,
      renderCell: (params) => (
        <Typography fontWeight="bold" color="error.main">
          {formatCurrency(params.value)}
        </Typography>
      )
    },
    {
      field: 'actions', headerName: 'Actions', width: 100, sortable: false, align: 'center', headerAlign: 'center',
      renderCell: (params) => (
        <Tooltip title="Mark as Paid">
          <IconButton
            color="success"
            onClick={() => handleMarkAsPaid(params.row)}
          >
            <CheckCircleIcon />
          </IconButton>
        </Tooltip>
      )
    }
  ];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <LoadingSpinner text="Loading Payables..." />
      </Box>
    );
  }

  return (
    <Box component={motion.div} variants={containerVariants} initial="hidden" animate="visible"> 
      
      {/* --- Date Filter Paper (Matched Layout) --- */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 2 }}>
        <Grid container spacing={2} alignItems="center">
          
          {/* Standardized Date Preset Buttons */}
          <Grid size={{ xs: 12 }}>
              <Box sx={{ overflowX: 'auto', pb: 0.5, whiteSpace: 'nowrap' }}>
                <ButtonGroup variant="outlined" aria-label="date range presets" size="small">
                    {['today', 'week', 'month', 'year', 'all'].map((preset) => (
                        <Button 
                            key={preset}
                            variant={datePreset === preset ? 'contained' : 'outlined'} 
                            onClick={() => handleDatePreset(preset)}
                            sx={{ textTransform: 'capitalize', borderRadius: 2 }}
                        >
                            {preset === 'all' ? 'All Time' : preset}
                        </Button>
                    ))}
                </ButtonGroup>
              </Box>
          </Grid>

          {/* Date Inputs */}
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
          </Grid>
        </Grid>
      </Paper>
      {/* ------------------------------------------- */}

      {/* Filter and Search Bar - Responsive Grid */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 2 }}>
        <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                label="Search by Product or Supplier"
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                fullWidth
                InputProps={{
                    startAdornment: (
                    <InputAdornment position="start">
                        <SearchIcon />
                    </InputAdornment>
                    ),
                }}
                />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
                <FormControl size="small" fullWidth>
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
            </Grid>
        </Grid>
      </Paper>

      {/* Total Owed Box */}
      <Box sx={{ mb: 2, textAlign: 'right' }}>
        <Typography variant="h5" component="p" color="error.main" fontWeight="bold">
          Total Owed (Filtered): {formatCurrency(totalOwed)}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper 
        sx={{ 
            height: '65vh', 
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
            },
            // Added to vertically center-align cell content
            '& .MuiDataGrid-cell': {
                display: 'flex',
                alignItems: 'center',
                py: 1
            }
        }}
      >
        <DataGrid
          rows={filteredPayables}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row._id}
          initialState={{
            sorting: { sortModel: [{ field: 'saleDate', sort: 'desc' }] },
          }}
        />
      </Paper>
    </Box>
  );
};

const ConsignmentPayoutsPage = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };
  
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
        Consignment Payouts
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Review items sold on consignment, mark them as paid, and view payout history.
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="consignment tabs">
          <Tab 
            label="Owed Payouts" 
            icon={<PaymentIcon />} 
            iconPosition="start" 
            id="payout-tab-0"
          />
          <Tab 
            label="Payout History" 
            icon={<HistoryIcon />} 
            iconPosition="start" 
            id="payout-tab-1"
          />
        </Tabs>
      </Box>

      <AnimatePresence mode="wait">
        {currentTab === 0 && (
            <motion.div key="owed" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                 <TabPanel value={currentTab} index={0}>
                    <OwedPayouts />
                </TabPanel>
            </motion.div>
        )}
        {currentTab === 1 && (
            <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <TabPanel value={currentTab} index={1}>
                    <PayoutHistory />
                </TabPanel>
            </motion.div>
        )}
      </AnimatePresence>
      
    </Container>
  );
};

export default ConsignmentPayoutsPage;