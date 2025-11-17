// client/src/components/reports/ReturnsReport.js
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
  Chip,
  Stack,
  Tooltip
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

const ReturnsReport = () => {
  const [customerReturns, setCustomerReturns] = useState([]);
  const [supplierReturns, setSupplierReturns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [datePreset, setDatePreset] = useState('today');
  const [startDate, setStartDate] = useState(startOfDay(new Date()));
  const [endDate, setEndDate] = useState(endOfDay(new Date()));

  const [filterCustomer, setFilterCustomer] = useState(null);
  const [filterProduct, setFilterProduct] = useState(null);
  const [filterSupplier, setFilterSupplier] = useState(null);
  const [filterReturnType, setFilterReturnType] = useState('all');

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isFilterLoading, setIsFilterLoading] = useState(true);

  // Load filter data
  useEffect(() => {
    const fetchFilterData = async () => {
      setIsFilterLoading(true);
      try {
        const [custRes, prodRes, suppRes] = await Promise.all([
          api.get('/customers'),
          api.get('/products'), 
          api.get('/suppliers?status=Approved'),
        ]);
        setCustomers(custRes.data);
        setProducts(prodRes.data);
        setSuppliers(suppRes.data);
      } catch (err) {
        toast.error('Failed to load filter data. Some filters may not work.');
      } finally {
        setIsFilterLoading(false);
      }
    };
    fetchFilterData();
  }, []);

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
      start = new Date(0); // Epoch start
    }
    
    setStartDate(start);
    setEndDate(end);
  };

  // Memoized summary
  const reportSummary = useMemo(() => {
    const totalCustomerRefunds = customerReturns.reduce((sum, ret) => sum + ret.totalRefundAmount, 0);
    const totalCustomerItems = customerReturns.reduce((sum, ret) => sum + ret.itemsReturned.reduce((qSum, item) => qSum + item.quantity, 0), 0);
    const totalSupplierItems = supplierReturns.reduce((sum, ret) => sum + ret.productsReturned.reduce((qSum, item) => qSum + item.quantity, 0), 0);
    
    return { totalCustomerRefunds, totalCustomerItems, totalSupplierItems };
  }, [customerReturns, supplierReturns]);

  // Auto-fetching function
  const fetchReportData = useCallback(async () => {
    if (!startDate || !endDate || startDate > endDate) {
      setError('Please select a valid date range.');
      return;
    }
    setError('');
    setIsLoading(true);
    setCustomerReturns([]);
    setSupplierReturns([]);
    
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate.toISOString());
      params.append('endDate', endDate.toISOString());
      params.append('returnType', filterReturnType);

      if (filterCustomer) params.append('customerId', filterCustomer._id);
      if (filterProduct) params.append('productId', filterProduct._id);
      if (filterSupplier) params.append('supplierId', filterSupplier._id);
      
      const response = await api.get(`/reports/returns?${params.toString()}`);
      setCustomerReturns(response.data.customerReturns || []);
      setSupplierReturns(response.data.supplierReturns || []);

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate returns report.');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, filterReturnType, filterCustomer, filterProduct, filterSupplier]);

  // useEffect to trigger fetchReportData on filter change
  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Download CSV Helper
  const escapeCSV = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
  const downloadCSV = (data, headers, filename) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(',') + '\n' + data.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Customer Returns CSV
  const handleDownloadCustomerCSV = () => {
    if (customerReturns.length === 0) {
      toast.warn("No customer return data to download.");
      return;
    }
    const headers = ["Date", "Customer", "Items Returned", "Reason", "Outcome", "Refund Amount"];
    const rows = customerReturns.map(ret => {
      const items = ret.itemsReturned.map(item => 
        `${item.quantity}x ${item.product?.name || 'N/A'}`
      ).join('; ');
      return [
        escapeCSV(new Date(ret.createdAt).toLocaleString()),
        escapeCSV(ret.originalSale?.customer?.name || 'Walk-in'),
        escapeCSV(items),
        escapeCSV(ret.reason),
        escapeCSV(ret.outcome),
        ret.totalRefundAmount
      ].join(',');
    });
    downloadCSV(rows, headers, `customer_returns_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Download Supplier Returns CSV
  const handleDownloadSupplierCSV = () => {
    if (supplierReturns.length === 0) {
      toast.warn("No supplier return data to download.");
      return;
    }
    const headers = ["Date", "Supplier", "Items Returned", "Reason", "Was Consigned"];
    const rows = supplierReturns.map(ret => {
      const items = ret.productsReturned.map(item => 
        `${item.quantity}x ${item.product?.name || 'N/A'}`
      ).join('; ');
      const reasons = [...new Set(ret.productsReturned.map(i => i.reason))].join('; ');
      const wasConsigned = ret.productsReturned.some(i => i.wasConsigned) ? 'Yes' : 'No';
      return [
        escapeCSV(new Date(ret.returnDate).toLocaleDateString()),
        escapeCSV(ret.supplier?.name || 'N/A'),
        escapeCSV(items),
        escapeCSV(reasons),
        escapeCSV(wasConsigned)
      ].join(',');
    });
    downloadCSV(rows, headers, `supplier_returns_${new Date().toISOString().split('T')[0]}.csv`);
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
    if (filterReturnType !== 'all') {
      filters.push(`Type: ${filterReturnType === 'customer' ? 'Customer' : 'Supplier'} Returns`);
    }
    if (filterCustomer) filters.push(`Customer: ${filterCustomer.name}`);
    if (filterProduct) filters.push(`Product: ${filterProduct.name}`);
    if (filterSupplier) filters.push(`Supplier: ${filterSupplier.name}`);
    return filters.join(' | ');
  };
  // --- END MODIFICATION ---
  
  // --- MODIFIED: Download PDF Function ---
  const handleDownloadPDF = () => {
    if (customerReturns.length === 0 && supplierReturns.length === 0) {
      toast.warn("No data to download.");
      return;
    }

    const doc = new jsPDF();
    const filename = `returns_report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.setProperties({ title: filename });
    
    const { totalCustomerRefunds, totalCustomerItems, totalSupplierItems } = reportSummary;
    let finalY = 35; // This is the starting Y point *after* the title and filter text

    doc.setFontSize(18);
    doc.text("Item Returns Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Filters: ${getFilterSummary()}`, 14, 30); // Use the correct filter text

    // --- Customer Returns Table ---
    if (customerReturns.length > 0) {
      const customerTableCols = ["Date", "Customer", "Items", "Reason", "Outcome", "Refund"];
      const customerTableRows = customerReturns.map(ret => {
        const items = ret.itemsReturned.map(item => `${item.quantity}x ${item.product?.name || 'N/A'}`).join('\n');
        return [
          new Date(ret.createdAt).toLocaleString(),
          ret.originalSale?.customer?.name || 'Walk-in',
          items,
          ret.reason,
          ret.outcome,
          `P${ret.totalRefundAmount.toFixed(2)}`
        ];
      });

      doc.setFontSize(14);
      doc.text("Customer Returns", 14, finalY + 5); // Add section title
      autoTable(doc, {
        head: [customerTableCols],
        body: customerTableRows,
        startY: finalY + 10
      });
      finalY = doc.lastAutoTable.finalY; // Update Y position
    }

    // --- Supplier Returns Table ---
    if (supplierReturns.length > 0) {
      // Add space if the first table was already drawn
      const supplierStartY = (customerReturns.length > 0) ? finalY + 15 : finalY; 
      
      doc.setFontSize(14);
      doc.text("Supplier Returns", 14, supplierStartY + 5); // Add section title
      
      const supplierTableCols = ["Date", "Supplier", "Items", "Reason", "Consigned"];
      const supplierTableRows = supplierReturns.map(ret => {
        const items = ret.productsReturned.map(item => `${item.quantity}x ${item.product?.name || 'N/A'}`).join('\n');
        const reasons = [...new Set(ret.productsReturned.map(i => i.reason))].join(', ');
        const wasConsigned = ret.productsReturned.some(i => i.wasConsigned) ? 'Yes' : 'No';
        return [
          new Date(ret.returnDate).toLocaleDateString(),
          ret.supplier?.name || 'N/A',
          items,
          reasons,
          wasConsigned
        ];
      });

      autoTable(doc, {
        head: [supplierTableCols],
        body: supplierTableRows,
        startY: supplierStartY + 10
      });
      finalY = doc.lastAutoTable.finalY; // Update Y position again
    }

    // --- Summary Section ---
    doc.setFontSize(12);
    doc.text("Summary", 14, finalY + 15);
    doc.setFontSize(10);
    doc.text(`Total Customer Refunds: P${totalCustomerRefunds.toFixed(2)}`, 14, finalY + 22);
    doc.text(`Total Customer Items Returned: ${totalCustomerItems} units`, 14, finalY + 29);
    doc.text(`Total Supplier Items Returned: ${totalSupplierItems} units`, 14, finalY + 36);

    doc.output('dataurlnewwindow'); // Open in new tab
  };
  // --- END MODIFICATION ---

  const SummaryCard = ({ title, value, isCurrency = false }) => (
    <Grid item size={{ xs: 12, sm: 4 }}>
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="subtitle1" color="text.secondary">{title}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          {isCurrency ? `₱${value.toFixed(2)}` : value}
        </Typography>
      </Paper>
    </Grid>
  );

  // Renders all filter components
  const renderFilters = () => (
    <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Row 1: Date Presets & Downloads */}
          <Grid item size={{ xs: 12, md: 7 }}>
            <ButtonGroup fullWidth>
              <Button variant={datePreset === 'today' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('today')}>Today</Button>
              <Button variant={datePreset === 'week' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('week')}>This Week</Button>
              <Button variant={datePreset === 'month' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('month')}>This Month</Button>
              <Button variant={datePreset === 'year' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('year')}>This Year</Button>
              <Button variant={datePreset === 'all' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('all')}>All Time</Button>
            </ButtonGroup>
          </Grid>
          
          <Grid item size={{ xs: 12, md: 5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} fullWidth>
              <Button 
                variant="outlined" 
                onClick={handleDownloadCustomerCSV} 
                disabled={isLoading || customerReturns.length === 0}
                startIcon={<DownloadIcon />}
                fullWidth
              >
                Customer CSV
              </Button>
              <Button 
                variant="outlined" 
                onClick={handleDownloadSupplierCSV} 
                disabled={isLoading || supplierReturns.length === 0}
                startIcon={<DownloadIcon />}
                fullWidth
              >
                Supplier CSV
              </Button>
              {/* --- NEW: PDF Preview Button --- */}
              <Button 
                variant="outlined" 
                color="secondary"
                onClick={handleDownloadPDF} 
                disabled={isLoading || (customerReturns.length === 0 && supplierReturns.length === 0)}
                startIcon={<PictureAsPdfIcon />}
                fullWidth
              >
                Preview PDF
              </Button>
              {/* --- END NEW --- */}
            </Stack>
          </Grid>

          {/* Row 2: Entity Filters */}
          <Grid item size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Return Type</InputLabel>
              <Select
                value={filterReturnType}
                label="Return Type"
                onChange={(e) => setFilterReturnType(e.target.value)}
              >
                <MenuItem value="all">All Returns</MenuItem>
                <MenuItem value="customer">Customer Returns</MenuItem>
                <MenuItem value="supplier">Supplier Returns</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item size={{ xs: 12, sm: 6, md: 3 }}>
            <Autocomplete
              options={products}
              getOptionLabel={(option) => `${option.name} (${option.itemCode})`}
              value={filterProduct}
              onChange={(e, newValue) => setFilterProduct(newValue)}
              isOptionEqualToValue={(o, v) => o._id === v._id}
              renderInput={(params) => <TextField {...params} label="Filter by Product" size="small" />}
              disabled={isFilterLoading}
            />
          </Grid>
          <Grid item size={{ xs: 12, sm: 6, md: 3 }}>
            <Autocomplete
              options={suppliers}
              getOptionLabel={(option) => option.name}
              value={filterSupplier}
              onChange={(e, newValue) => setFilterSupplier(newValue)}
              isOptionEqualToValue={(o, v) => o._id === v._id}
              renderInput={(params) => <TextField {...params} label="Filter by Supplier" size="small" />}
              disabled={isFilterLoading || filterReturnType === 'customer'}
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
              disabled={isFilterLoading || filterReturnType === 'supplier'}
            />
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
            <SummaryCard title="Total Customer Refunds" value={reportSummary.totalCustomerRefunds} isCurrency />
            <SummaryCard title="Total Customer Items Returned" value={reportSummary.totalCustomerItems} />
            <SummaryCard title="Total Supplier Items Returned" value={reportSummary.totalSupplierItems} />
          </Grid>

          {customerReturns.length === 0 && supplierReturns.length === 0 ? (
            <Alert severity="info">No return data found for the selected filters.</Alert>
          ) : (
            <Grid container spacing={3}>
              {/* Customer Returns Table */}
              {customerReturns.length > 0 && (
                <Grid item size={{ xs: 12 }}>
                  <Typography variant="h6" gutterBottom>Customer Returns</Typography>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead sx={{ backgroundColor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Items</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Outcome</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }} align="right">Refund Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {customerReturns.map((ret) => (
                          <TableRow key={ret._id} hover>
                            <TableCell>{new Date(ret.createdAt).toLocaleString()}</TableCell>
                            <TableCell>{ret.originalSale?.customer?.name || 'Walk-in'}</TableCell>
                            <TableCell>
                              <List dense disablePadding>
                                {ret.itemsReturned.map(item => (
                                  <ListItem key={item._id} disableGutters sx={{ p: 0 }}>
                                    <ListItemText primary={`${item.quantity}x ${item.product?.name || 'N/A'}`} />
                                  </ListItem>
                                ))}
                              </List>
                            </TableCell>
                            <TableCell>{ret.reason}</TableCell>
                            <TableCell><Chip label={ret.outcome} size="small" color={ret.outcome === 'Discarded' ? 'error' : 'default'} /></TableCell>
                            <TableCell align="right">{`₱${ret.totalRefundAmount.toFixed(2)}`}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              )}

              {/* Supplier Returns Table */}
              {supplierReturns.length > 0 && (
                <Grid item size={{ xs: 12 }}>
                  <Typography variant="h6" gutterBottom>Supplier Returns</Typography>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead sx={{ backgroundColor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Supplier</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Items</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {supplierReturns.map((ret) => (
                          <TableRow key={ret._id} hover>
                            <TableCell>{new Date(ret.returnDate).toLocaleDateString()}</TableCell>
                            <TableCell>{ret.supplier?.name || 'N/A'}</TableCell>
                            <TableCell>
                              <List dense disablePadding>
                                {ret.productsReturned.map(item => (
                                  <ListItem key={item._id} disableGutters sx={{ p: 0 }}>
                                    <ListItemText primary={`${item.quantity}x ${item.product?.name || 'N/A'}`} />
                                    {item.wasConsigned && <Chip label="Consigned" size="small" color="info" sx={{ ml: 1 }} />}
                                  </ListItem>
                                ))}
                              </List>
                            </TableCell>
                            <TableCell>
                              {[...new Set(ret.productsReturned.map(i => i.reason))].join(', ')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              )}
            </Grid>
          )}
        </>
      )}
    </Box>
  );
};

export default ReturnsReport;