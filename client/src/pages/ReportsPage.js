// client/src/pages/ReportsPage.js
import React, { useState, useMemo, useEffect } from 'react';
import api from '../api/axios';
// --- NEW: Import toast ---
import { toast } from 'react-toastify';

// MUI Imports
import {
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  List,
  ListItem,
  ListItemText,
  Container,
  Box,
  CircularProgress,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ButtonGroup, // For date presets
} from '@mui/material';


const ReportsPage = () => {
  // --- REMOVED: startDate and endDate state ---
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [wasGenerated, setWasGenerated] = useState(false);
  
  // --- UPDATED: State for filters ---
  const [datePreset, setDatePreset] = useState('today'); // Default to 'today'
  const [filterCustomer, setFilterCustomer] = useState(null);
  const [filterProduct, setFilterProduct] = useState(null);
  const [filterSupplier, setFilterSupplier] = useState(null);
  const [filterUser, setFilterUser] = useState(null); // 'All Users'

  // --- State for dropdown data ---
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [users, setUsers] = useState([]);
  const [isFilterLoading, setIsFilterLoading] = useState(true);

  // --- Effect to load filter data ---
  useEffect(() => {
    const fetchFilterData = async () => {
      setIsFilterLoading(true);
      try {
        const [custRes, prodRes, suppRes, userRes] = await Promise.all([
          api.get('/customers'),
          api.get('/products?status=active'),
          api.get('/suppliers?status=Approved'),
          api.get('/users?fields=fullName,role')
        ]);
        setCustomers(custRes.data);
        setProducts(prodRes.data);
        setSuppliers(suppRes.data);
        setUsers(userRes.data);
      } catch (err) {
        toast.error('Failed to load filter data. Some filters may not work.');
        console.error("Failed to load filter data:", err);
      } finally {
        setIsFilterLoading(false);
      }
    };
    fetchFilterData();
  }, []);

  // --- UPDATED: Handler for date preset buttons ---
  const handleDatePreset = (preset) => {
    setDatePreset(preset);
  };

  // --- FIX: Profit calculation now uses costOfGoodsSold ---
  const reportSummary = useMemo(() => {
    if (reportData.length === 0) {
      return { totalRevenue: 0, totalCost: 0, totalProfit: 0 };
    }
    const totalRevenue = reportData.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalCost = reportData.reduce((sum, sale) => {
      const saleCost = sale.items.reduce((itemSum, item) => {
        // Use the accurate historical COGS
        return itemSum + (item.costOfGoodsSold || 0) * item.quantity;
      }, 0);
      // Add cost of services (assuming cost is 0, add logic if services have cost)
      return sum + saleCost;
    }, 0);
    const totalProfit = totalRevenue - totalCost;
    return { totalRevenue, totalCost, totalProfit };
  }, [reportData]);

  const handleGenerateReport = async () => {
    // --- REMOVED: Date range check ---
    setError('');
    setIsLoading(true);
    setWasGenerated(true);
    setReportData([]);
    
    try {
      // --- NEW: Build query parameters ---
      const params = new URLSearchParams({
        range: datePreset, // Pass the preset range
      });
      if (filterCustomer) params.append('customerId', filterCustomer._id);
      if (filterProduct) params.append('productId', filterProduct._id);
      if (filterSupplier) params.append('supplierId', filterSupplier._id);
      if (filterUser) params.append('userId', filterUser._id);
      
      const response = await api.get(`/reports/sales?${params.toString()}`);
      setReportData(response.data);

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report.');
    } finally {
      setIsLoading(false);
    }
  };

  const SummaryCard = ({ title, value, profit = false }) => (
    <Grid item size={{ xs: 12, sm: 4 }}> {/* Using your 'size' prop syntax */}
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="subtitle1" color="text.secondary">{title}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: profit ? (value >= 0 ? 'success.main' : 'error.main') : 'text.primary' }}>
          {`₱${value.toFixed(2)}`}
        </Typography>
      </Paper>
    </Grid>
  );

  // --- UPDATED: Renders all filter components ---
  const renderFilters = () => (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        {/* Row 1: Date Presets and Generate Button */}
        <Grid item size={{ xs: 12, md: 8 }}>
          <ButtonGroup fullWidth>
            <Button variant={datePreset === 'today' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('today')}>Today</Button>
            <Button variant={datePreset === 'week' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('week')}>This Week</Button>
            <Button variant={datePreset === 'month' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('month')}>This Month</Button>
            <Button variant={datePreset === 'year' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('year')}>This Year</Button>
          </ButtonGroup>
        </Grid>
        
        {/* --- REMOVED: Start/End Date TextFields --- */}

        <Grid item size={{ xs: 12, md: 4 }} sx={{ textAlign: 'right' }}>
           <Button variant="contained" onClick={handleGenerateReport} disabled={isLoading} size="large" fullWidth>
            {isLoading ? 'Generating...' : 'Generate Report'}
          </Button>
        </Grid>

        {/* Row 2: Entity Filters */}
        <Grid item size={{ xs: 12, sm: 6, md: 3 }}>
          <Autocomplete
            options={products}
            getOptionLabel={(option) => `${option.name} (${option.itemCode})`}
            value={filterProduct}
            onChange={(e, newValue) => {
              setFilterProduct(newValue);
              if (newValue) setFilterSupplier(null); // Clear supplier if product is set
            }}
            isOptionEqualToValue={(o, v) => o._id === v._id}
            renderInput={(params) => <TextField {...params} label="Filter by Product" size="small" />}
            disabled={isFilterLoading || !!filterSupplier}
          />
        </Grid>
        <Grid item size={{ xs: 12, sm: 6, md: 3 }}>
          <Autocomplete
            options={suppliers}
            getOptionLabel={(option) => option.name}
            value={filterSupplier}
            onChange={(e, newValue) => {
              setFilterSupplier(newValue);
              if (newValue) setFilterProduct(null); // Clear product if supplier is set
            }}
            isOptionEqualToValue={(o, v) => o._id === v._id}
            renderInput={(params) => <TextField {...params} label="Filter by Supplier" size="small" />}
            disabled={isFilterLoading || !!filterProduct}
          />
        </Grid>
        <Grid item size={{ xs: 12, sm: 6, md: 3 }}>
          <Autocomplete
            options={customers}
            getOptionLabel={(option) => option.name}
            value={filterCustomer}
            onChange={(e, newValue) => setFilterCustomer(newValue)}
            isOptionEqualToValue={(o, v) => o._id === v._id}
            renderInput={(params) => <TextField {...params} label="Filter by Customer" size="small" />}
            disabled={isFilterLoading}
          />
        </Grid>
        <Grid item size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl fullWidth size="small" disabled={isFilterLoading}>
            <InputLabel>Filter by User</InputLabel>
            <Select
              value={filterUser ? filterUser._id : ''}
              label="Filter by User"
              onChange={(e) => setFilterUser(users.find(u => u._id === e.target.value) || null)}
            >
              <MenuItem value=""><em>All Users</em></MenuItem>
              {users.map(user => (
                <MenuItem key={user._id} value={user._id}>{user.fullName}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Paper>
  );

  return (
    <Container maxWidth="xl" sx={{ p: 3, mt: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
        Sales & Profitability Report
      </Typography>

      {isFilterLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading filters...</Typography>
        </Box>
      ) : (
        renderFilters()
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {wasGenerated && !isLoading && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <SummaryCard title="Total Revenue" value={reportSummary.totalRevenue} />
            <SummaryCard title="Cost of Goods Sold" value={reportSummary.totalCost} />
            <SummaryCard title="Gross Profit" value={reportSummary.totalProfit} profit />
          </Grid>

          {reportData.length > 0 ? (
            <TableContainer component={Paper}>
              <Table>
                <TableHead sx={{ backgroundColor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Items Sold</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Recorded By</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Total Revenue</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Total Profit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.map((sale) => {
                    // --- FIX: Use costOfGoodsSold for accurate historical profit ---
                    const saleCost = sale.items.reduce((sum, item) => sum + (item.costOfGoodsSold || 0) * item.quantity, 0);
                    const saleProfit = sale.totalAmount - saleCost;
                    
                    return (
                      <TableRow key={sale._id} hover>
                        <TableCell>{new Date(sale.createdAt).toLocaleString()}</TableCell>
                        <TableCell>{sale.customer?.name || 'Walk-in'}</TableCell>
                        <TableCell>
                          <List dense disablePadding>
                            {sale.items.map(item => (
                              <ListItem key={item._id} disableGutters sx={{ p: 0 }}>
                                <ListItemText 
                                  primary={`${item.quantity}x ${item.product?.name || 'N/A'}`} 
                                  secondary={`@ ₱${item.priceAtTime.toFixed(2)}`}
                                />
                              </ListItem>
                            ))}
                            {/* Also list services */}
                            {sale.services.map(service => (
                              <ListItem key={service._id} disableGutters sx={{ p: 0 }}>
                                 <ListItemText 
                                  primary={`1x ${service.service?.name || 'N/A'}`} 
                                  secondary={`@ ₱${service.priceAtTime.toFixed(2)}`}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </TableCell>
                        <TableCell>{sale.recordedBy?.fullName || 'N/A'}</TableCell>
                        <TableCell>{`₱${sale.totalAmount.toFixed(2)}`}</TableCell>
                        <TableCell sx={{ color: saleProfit >= 0 ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                          {`₱${saleProfit.toFixed(2)}`}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">No sales data found for the selected filters.</Alert>
          )}
        </>
      )}
    </Container>
  );
};

export default ReportsPage;