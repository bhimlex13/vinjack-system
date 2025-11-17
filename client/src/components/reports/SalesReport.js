// client/src/components/reports/SalesReport.js
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// --- MODIFIED: Added 'format' ---
import { startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';
// --- END MODIFICATION ---

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
  Box,
  CircularProgress,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ButtonGroup, 
  Stack,
  Tooltip
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

// This component is rendered inside the ReportsPage tab
const SalesReport = () => {
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [datePreset, setDatePreset] = useState('today');
  const [startDate, setStartDate] = useState(startOfDay(new Date()));
  const [endDate, setEndDate] = useState(endOfDay(new Date()));

  const [filterCustomer, setFilterCustomer] = useState(null);
  const [filterProduct, setFilterProduct] = useState(null);
  const [filterSupplier, setFilterSupplier] = useState(null);
  const [filterUser, setFilterUser] = useState(null); 

  // State for dropdown data
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [users, setUsers] = useState([]);
  const [isFilterLoading, setIsFilterLoading] = useState(true);

  // Effect to load filter data
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
      } finally {
        setIsFilterLoading(false);
      }
    };
    fetchFilterData();
  }, []);

  // Handler for date preset buttons
  const handleDatePreset = (preset) => {
    const now = new Date();
    let start = startOfDay(now);
    let end = endOfDay(now);
    setDatePreset(preset); 

    if (preset === 'week') {
      start = startOfWeek(now);
    } else if (preset === 'month') {
      start = startOfMonth(now);
    } else if (preset === 'year') {
      start = startOfYear(now);
    } else if (preset === 'all') {
      start = new Date(0); // Epoch start for "all time"
    }
    
    setStartDate(start);
    setEndDate(end);
  };

  // Auto-fetching function
  const fetchReportData = useCallback(async () => {
    if (!startDate || !endDate || startDate > endDate) {
      setError('Please select a valid date range.');
      return;
    }
    setError('');
    setIsLoading(true);
    setReportData([]);
    
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate.toISOString());
      params.append('endDate', endDate.toISOString());

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
  }, [startDate, endDate, filterCustomer, filterProduct, filterSupplier, filterUser]);

  // useEffect to trigger fetchReportData on filter change
  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Profit calculation
  const reportSummary = useMemo(() => {
    if (reportData.length === 0) {
      return { totalRevenue: 0, totalCost: 0, totalProfit: 0 };
    }
    const totalRevenue = reportData.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalCost = reportData.reduce((sum, sale) => {
      const saleCost = sale.items.reduce((itemSum, item) => {
        return itemSum + (item.costOfGoodsSold || 0) * item.quantity;
      }, 0);
      return sum + saleCost;
    }, 0);
    const totalProfit = totalRevenue - totalCost;
    return { totalRevenue, totalCost, totalProfit };
  }, [reportData]);

  // Download CSV Function
  const handleDownloadCSV = () => {
    if (reportData.length === 0) {
      toast.warn("No data to download.");
      return;
    }
    const escapeCSV = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
    const headers = ["Date", "Customer", "Items Sold", "Services Sold", "Recorded By", "Total Revenue", "Total Cost", "Total Profit"];
    const rows = reportData.map(sale => {
      const items = sale.items.map(item => `${item.quantity}x ${item.product?.name || 'N/A'}`).join('; ');
      const services = sale.services.map(service => `1x ${service.service?.name || 'N/A'}`).join('; ');
      const saleCost = sale.items.reduce((sum, item) => sum + (item.costOfGoodsSold || 0) * item.quantity, 0);
      const saleProfit = sale.totalAmount - saleCost;
      return [
        escapeCSV(new Date(sale.createdAt).toLocaleString()),
        escapeCSV(sale.customer?.name || 'Walk-in'),
        escapeCSV(items),
        escapeCSV(services),
        escapeCSV(sale.recordedBy?.fullName || 'N/A'),
        sale.totalAmount,
        saleCost,
        saleProfit
      ].join(',');
    });
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + '\n' + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- MODIFIED: Helper function to get filter text for PDF ---
  const getFilterSummary = () => {
    let filters = [];
    
    // Date Filter
    if (datePreset === 'all') {
      filters.push('Date: All Time');
    } else if (format(startDate, 'MM/dd/yyyy') === format(endDate, 'MM/dd/yyyy')) {
      filters.push(`Date: ${format(startDate, 'MM/dd/yyyy')}`);
    } else {
      filters.push(`Date Range: ${format(startDate, 'MM/dd/yyyy')} - ${format(endDate, 'MM/dd/yyyy')}`);
    }

    // Other filters
    if (filterCustomer) filters.push(`Customer: ${filterCustomer.name}`);
    if (filterProduct) filters.push(`Product: ${filterProduct.name}`);
    if (filterSupplier) filters.push(`Supplier: ${filterSupplier.name}`);
    if (filterUser) filters.push(`User: ${filterUser.fullName}`);
    return filters.join(' | ');
  };
  // --- END MODIFICATION ---
  
  // --- MODIFIED: Download PDF Function ---
  const handleDownloadPDF = () => {
    if (reportData.length === 0) {
      toast.warn("No data to download.");
      return;
    }

    const doc = new jsPDF();
    // --- NEW: Set document title ---
    const filename = `sales_report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.setProperties({ title: filename });
    // --- END NEW ---

    const { totalRevenue, totalCost, totalProfit } = reportSummary;
    const tableColumn = ["Date", "Customer", "Items", "Services", "Recorded By", "Revenue", "Cost", "Profit"];
    const tableRows = [];

    reportData.forEach(sale => {
      const items = sale.items.map(item => `${item.quantity}x ${item.product?.name || 'N/A'}`).join('\n');
      const services = sale.services.map(service => `1x ${service.service?.name || 'N/A'}`).join('\n');
      const saleCost = sale.items.reduce((sum, item) => sum + (item.costOfGoodsSold || 0) * item.quantity, 0);
      const saleProfit = sale.totalAmount - saleCost;

      const row = [
        new Date(sale.createdAt).toLocaleString(),
        sale.customer?.name || 'Walk-in',
        items,
        services,
        sale.recordedBy?.fullName || 'N/A',
        `P${sale.totalAmount.toFixed(2)}`,
        `P${saleCost.toFixed(2)}`,
        `P${saleProfit.toFixed(2)}`
      ];
      tableRows.push(row);
    });

    doc.setFontSize(18);
    doc.text("Sales & Profitability Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Filters: ${getFilterSummary()}`, 14, 30); // Uses new function

    autoTable(doc, { 
      head: [tableColumn], 
      body: tableRows, 
      startY: 35 
    });
    
    const finalY = doc.lastAutoTable.finalY || 50;
    doc.setFontSize(12);
    doc.text("Summary", 14, finalY + 15);
    doc.setFontSize(10);
    doc.text(`Total Revenue: P${totalRevenue.toFixed(2)}`, 14, finalY + 22);
    doc.text(`Total Cost of Goods: P${totalCost.toFixed(2)}`, 14, finalY + 29);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Gross Profit: P${totalProfit.toFixed(2)}`, 14, finalY + 36);

    doc.output('dataurlnewwindow'); // Opens in a new tab
  };
  // --- END MODIFICATION ---

  const SummaryCard = ({ title, value, profit = false }) => (
    <Grid item size={{ xs: 12, sm: 4 }}>
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="subtitle1" color="text.secondary">{title}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: profit ? (value >= 0 ? 'success.main' : 'error.main') : 'text.primary' }}>
          {`₱${value.toFixed(2)}`}
        </Typography>
      </Paper>
    </Grid>
  );

  const renderFilters = () => (
    <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Row 1: Date Presets */}
          <Grid item size={{ xs: 12, md: 7 }}>
            <ButtonGroup fullWidth>
              <Button variant={datePreset === 'today' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('today')}>Today</Button>
              <Button variant={datePreset === 'week' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('week')}>This Week</Button>
              <Button variant={datePreset === 'month' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('month')}>This Month</Button>
              <Button variant={datePreset === 'year' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('year')}>This Year</Button>
              <Button variant={datePreset === 'all' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('all')}>All Time</Button>
            </ButtonGroup>
          </Grid>
          
          {/* Row 1: Download Buttons */}
          <Grid item size={{ xs: 12, md: 5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} fullWidth>
              <Button 
                variant="outlined" 
                onClick={handleDownloadCSV} 
                disabled={isLoading || reportData.length === 0}
                startIcon={<DownloadIcon />}
                fullWidth
              >
                Download CSV (Excel)
              </Button>
              <Button 
                variant="outlined" 
                color="secondary"
                onClick={handleDownloadPDF} 
                disabled={isLoading || reportData.length === 0}
                startIcon={<PictureAsPdfIcon />}
                fullWidth
              >
                Preview PDF
              </Button>
            </Stack>
          </Grid>

          {/* Row 2: Entity Filters */}
          <Grid item size={{ xs: 12, sm: 6, md: 3 }}>
            <Autocomplete
              options={products}
              getOptionLabel={(option) => `${option.name} (${option.itemCode})`}
              value={filterProduct}
              onChange={(e, newValue) => {
                setFilterProduct(newValue);
                if (newValue) setFilterSupplier(null); 
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
                if (newValue) setFilterProduct(null); 
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
    <Box>
      {isFilterLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading filters...</Typography>
        </Box>
      ) : (
        renderFilters()
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
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
    </Box>
  );
};

export default SalesReport;