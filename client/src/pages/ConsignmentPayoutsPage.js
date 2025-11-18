// client/src/pages/ConsignmentPayoutsPage.js
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { getOwedPayables, markPayableAsPaid } from '../api/consignmentApi';
import ConfirmationContext from '../context/ConfirmationContext';
import { toast } from 'react-toastify';
// --- NEW: Import the history component and tabs ---
import PayoutHistory from '../components/reports/PayoutHistory';
import {
  Container, Typography, Paper, Box, CircularProgress, Alert, Tooltip, IconButton,
  TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem,
  Tabs, // <-- NEW
  Tab   // <-- NEW
} from '@mui/material';
// --- END NEW ---
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
// --- NEW: Icons for tabs ---
import PaymentIcon from '@mui/icons-material/Payment';
import HistoryIcon from '@mui/icons-material/History';
// --- END NEW ---

// Helper to format currency
const formatCurrency = (value) => 
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

// Helper to format dates
const formatDateTime = (dateString) => 
  dateString ? new Date(dateString).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'N/A';

// --- NEW: TabPanel helper ---
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
// --- END NEW ---

// --- MOVED: This is now the content for the FIRST tab ---
const OwedPayouts = () => {
  const [payables, setPayables] = useState([]);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const { confirm } = useContext(ConfirmationContext);

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
      const supplierMatch = filterSupplier ? p.supplier?._id === filterSupplier : true;
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const searchMatch = !searchTerm ||
        (p.product?.name?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (p.product?.itemCode?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (p.supplier?.name?.toLowerCase().includes(lowerCaseSearchTerm));
      return supplierMatch && searchMatch;
    });
  }, [payables, searchTerm, filterSupplier]);
  
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

  return (
    <Box> {/* Return a Box, not a Container, as it's inside a tab */}
      {/* Filter and Search Bar */}
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

      {/* Total Owed Box */}
      <Box sx={{ mb: 2, textAlign: 'right' }}>
        <Typography variant="h5" component="p" color="error.main" fontWeight="bold">
          Total Owed (Filtered): {formatCurrency(totalOwed)}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ height: '65vh', width: '100%' }}>
        <DataGrid
          rows={filteredPayables}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row._id}
          initialState={{
            sorting: { sortModel: [{ field: 'saleDate', sort: 'desc' }] },
          }}
          sx={{ '& .MuiDataGrid-cell': { py: 1 } }}
        />
      </Paper>
    </Box>
  );
};
// --- END of OwedPayouts component ---


// --- NEW: Main Page Shell ---
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

      {/* Tab 1: Owed Payouts */}
      <TabPanel value={currentTab} index={0}>
        <OwedPayouts />
      </TabPanel>

      {/* Tab 2: Payout History */}
      <TabPanel value={currentTab} index={1}>
        <PayoutHistory />
      </TabPanel>
      
    </Container>
  );
};

export default ConsignmentPayoutsPage;