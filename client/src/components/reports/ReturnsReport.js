// client/src/components/reports/ReturnsReport.js
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';
import { motion } from 'framer-motion';

// MUI Imports
import {
  Typography, Paper, TextField, Button, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Alert, List, ListItem, ListItemText,
  Box, Autocomplete, FormControl, InputLabel, Select, MenuItem, ButtonGroup,
  Chip, Stack, useTheme
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import LoadingSpinner from '../LoadingSpinner';

// Icons
import { FaUndo, FaBoxOpen, FaTruckLoading } from 'react-icons/fa';

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } }
  };

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
        toast.error('Failed to load filter data.');
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

    if (preset === 'week') start = startOfWeek(now);
    else if (preset === 'month') start = startOfMonth(now);
    else if (preset === 'year') start = startOfYear(now);
    else if (preset === 'all') start = new Date(0);
    
    setStartDate(start);
    setEndDate(end);
  };

  const reportSummary = useMemo(() => {
    const totalCustomerRefunds = customerReturns.reduce((sum, ret) => sum + ret.totalRefundAmount, 0);
    const totalCustomerItems = customerReturns.reduce((sum, ret) => sum + ret.itemsReturned.reduce((qSum, item) => qSum + item.quantity, 0), 0);
    const totalSupplierItems = supplierReturns.reduce((sum, ret) => sum + ret.productsReturned.reduce((qSum, item) => qSum + item.quantity, 0), 0);
    
    return { totalCustomerRefunds, totalCustomerItems, totalSupplierItems };
  }, [customerReturns, supplierReturns]);

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

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const escapeCSV = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
  const downloadCSV = (data, headers, filename) => {
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + '\n' + data.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCustomerCSV = () => {
    if (customerReturns.length === 0) return toast.warn("No customer data.");
    const headers = ["Date", "Customer", "Items Returned", "Reason", "Outcome", "Refund Amount"];
    const rows = customerReturns.map(ret => {
      const items = ret.itemsReturned.map(item => `${item.quantity}x ${item.product?.name || 'N/A'}`).join('; ');
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

  const handleDownloadSupplierCSV = () => {
    if (supplierReturns.length === 0) return toast.warn("No supplier data.");
    const headers = ["Date", "Supplier", "Items Returned", "Reason", "Was Consigned"];
    const rows = supplierReturns.map(ret => {
      const items = ret.productsReturned.map(item => `${item.quantity}x ${item.product?.name || 'N/A'}`).join('; ');
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

  const getFilterSummary = () => {
    let filters = [];
    if (datePreset === 'all') filters.push('Date: All Time');
    else if (format(startDate, 'MM/dd/yyyy') === format(endDate, 'MM/dd/yyyy')) filters.push(`Date: ${format(startDate, 'MM/dd/yyyy')}`);
    else filters.push(`Date Range: ${format(startDate, 'MM/dd/yyyy')} - ${format(endDate, 'MM/dd/yyyy')}`);

    if (filterReturnType !== 'all') filters.push(`Type: ${filterReturnType === 'customer' ? 'Customer' : 'Supplier'} Returns`);
    if (filterCustomer) filters.push(`Customer: ${filterCustomer.name}`);
    if (filterProduct) filters.push(`Product: ${filterProduct.name}`);
    if (filterSupplier) filters.push(`Supplier: ${filterSupplier.name}`);
    return filters.join(' | ');
  };
  
  const handleDownloadPDF = () => {
    if (customerReturns.length === 0 && supplierReturns.length === 0) return toast.warn("No data.");
    const doc = new jsPDF();
    const filename = `returns_report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.setProperties({ title: filename });
    
    const { totalCustomerRefunds, totalCustomerItems, totalSupplierItems } = reportSummary;
    let finalY = 35;

    doc.setFontSize(18);
    doc.text("Item Returns Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Filters: ${getFilterSummary()}`, 14, 30);

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
      doc.text("Customer Returns", 14, finalY + 5);
      autoTable(doc, { head: [customerTableCols], body: customerTableRows, startY: finalY + 10 });
      finalY = doc.lastAutoTable.finalY;
    }

    if (supplierReturns.length > 0) {
      const supplierStartY = (customerReturns.length > 0) ? finalY + 15 : finalY;
      doc.setFontSize(14);
      doc.text("Supplier Returns", 14, supplierStartY + 5);
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
      autoTable(doc, { head: [supplierTableCols], body: supplierTableRows, startY: supplierStartY + 10 });
      finalY = doc.lastAutoTable.finalY;
    }

    doc.setFontSize(12);
    doc.text("Summary", 14, finalY + 15);
    doc.setFontSize(10);
    doc.text(`Total Customer Refunds: P${totalCustomerRefunds.toFixed(2)}`, 14, finalY + 22);
    doc.text(`Total Customer Items Returned: ${totalCustomerItems} units`, 14, finalY + 29);
    doc.text(`Total Supplier Items Returned: ${totalSupplierItems} units`, 14, finalY + 36);

    doc.output('dataurlnewwindow');
  };

  // --- FIXED: SummaryCard with explicit animation ---
  const SummaryCard = ({ title, value, icon, color }) => (
    <Grid size={{ xs: 12, sm: 4 }}>
      <Paper 
        component={motion.div} 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        elevation={2} 
        sx={{ 
          p: 3, 
          display: 'flex', 
          alignItems: 'center', 
          borderRadius: 3, 
          height: '100%',
          borderLeft: `5px solid`,
          borderLeftColor: `${color}.main`
        }}
      >
        <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: `${color}.50`, color: `${color}.main`, mr: 2 }}>
            {icon}
        </Box>
        <Box>
            <Typography variant="body2" color="textSecondary">{title}</Typography>
            <Typography variant="h5" fontWeight={700}>{value}</Typography>
        </Box>
      </Paper>
    </Grid>
  );

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
           <FilterAltIcon color="action" sx={{ mr: 1 }} />
           <Typography variant="h6" fontWeight={700}>Return Filters</Typography>
        </Box>

        {isFilterLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <LoadingSpinner text="Loading Filters..." />
            </Box>
        ) : (
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <ButtonGroup fullWidth variant="outlined">
                 {['today', 'week', 'month', 'year', 'all'].map((p) => (
                  <Button 
                    key={p} 
                    variant={datePreset === p ? 'contained' : 'outlined'} 
                    onClick={() => handleDatePreset(p)}
                    sx={{ textTransform: 'capitalize' }}
                  >
                    {p === 'all' ? 'All Time' : p}
                  </Button>
                ))}
              </ButtonGroup>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack direction="row" spacing={1} fullWidth>
                <Button variant="outlined" onClick={handleDownloadCustomerCSV} disabled={isLoading || customerReturns.length === 0} startIcon={<DownloadIcon />} fullWidth>Cust CSV</Button>
                <Button variant="outlined" onClick={handleDownloadSupplierCSV} disabled={isLoading || supplierReturns.length === 0} startIcon={<DownloadIcon />} fullWidth>Supp CSV</Button>
                <Button variant="contained" color="secondary" onClick={handleDownloadPDF} disabled={isLoading || (customerReturns.length === 0 && supplierReturns.length === 0)} startIcon={<PictureAsPdfIcon />} fullWidth>PDF</Button>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Return Type</InputLabel>
                <Select value={filterReturnType} label="Return Type" onChange={(e) => setFilterReturnType(e.target.value)}>
                  <MenuItem value="all">All Returns</MenuItem>
                  <MenuItem value="customer">Customer Returns</MenuItem>
                  <MenuItem value="supplier">Supplier Returns</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Autocomplete
                options={products}
                getOptionLabel={(option) => `${option.name} (${option.itemCode})`}
                value={filterProduct}
                onChange={(e, newValue) => setFilterProduct(newValue)}
                isOptionEqualToValue={(o, v) => o._id === v._id}
                renderInput={(params) => <TextField {...params} label="Product" size="small" />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Autocomplete
                options={suppliers}
                getOptionLabel={(option) => option.name}
                value={filterSupplier}
                onChange={(e, newValue) => setFilterSupplier(newValue)}
                isOptionEqualToValue={(o, v) => o._id === v._id}
                renderInput={(params) => <TextField {...params} label="Supplier" size="small" />}
                disabled={filterReturnType === 'customer'}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Autocomplete
                options={customers}
                getOptionLabel={(option) => option.name}
                value={filterCustomer}
                onChange={(e, newValue) => setFilterCustomer(newValue)}
                isOptionEqualToValue={(o, v) => o._id === v._id}
                renderInput={(params) => <TextField {...params} label="Customer" size="small" />}
                disabled={filterReturnType === 'supplier'}
              />
            </Grid>
          </Grid>
        )}
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {isLoading ? (
        <Box sx={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingSpinner text="Analyzing Returns..." />
        </Box>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <SummaryCard title="Total Customer Refunds" value={`₱${reportSummary.totalCustomerRefunds.toFixed(2)}`} icon={<FaUndo />} color="error" />
            <SummaryCard title="Cust. Items Returned" value={`${reportSummary.totalCustomerItems} units`} icon={<FaBoxOpen />} color="warning" />
            <SummaryCard title="Supp. Items Returned" value={`${reportSummary.totalSupplierItems} units`} icon={<FaTruckLoading />} color="info" />
          </Grid>

          {customerReturns.length === 0 && supplierReturns.length === 0 ? (
            <Alert severity="info" sx={{ mt: 3 }}>No return data found for the selected filters.</Alert>
          ) : (
            <Grid container spacing={3}>
              {/* Customer Returns Table */}
              {customerReturns.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                    <Box sx={{ p: 2, bgcolor: 'error.light', color: 'error.dark' }}>
                        <Typography variant="h6" fontWeight={700}>Customer Returns</Typography>
                    </Box>
                    <TableContainer sx={{ maxHeight: 500 }}>
                      <Table stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Items</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Outcome</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">Refund</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {customerReturns.map((ret) => (
                            <TableRow key={ret._id} hover>
                              <TableCell>{new Date(ret.createdAt).toLocaleDateString()}</TableCell>
                              <TableCell>{ret.originalSale?.customer?.name || 'Walk-in'}</TableCell>
                              <TableCell>
                                <List dense disablePadding>
                                  {ret.itemsReturned.map(item => (
                                    <ListItem key={item._id} disableGutters sx={{ p: 0 }}>
                                      <ListItemText primaryTypographyProps={{ fontSize: '0.85rem' }} primary={`${item.quantity}x ${item.product?.name || 'N/A'}`} />
                                    </ListItem>
                                  ))}
                                </List>
                              </TableCell>
                              <TableCell>{ret.reason}</TableCell>
                              <TableCell>
                                <Chip 
                                    label={ret.outcome} 
                                    size="small" 
                                    color={ret.outcome === 'Restocked' ? 'success' : 'error'} 
                                    variant="outlined" 
                                    sx={{ fontWeight: 600 }}
                                />
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, color: 'error.main' }}>{`₱${ret.totalRefundAmount.toFixed(2)}`}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              )}

              {/* Supplier Returns Table */}
              {supplierReturns.length > 0 && (
                <Grid size={{ xs: 12 }}>
                   <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                    <Box sx={{ p: 2, bgcolor: 'info.light', color: 'info.dark' }}>
                        <Typography variant="h6" fontWeight={700}>Supplier Returns</Typography>
                    </Box>
                    <TableContainer sx={{ maxHeight: 500 }}>
                      <Table stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Supplier</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Items</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
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
                                      <ListItemText primaryTypographyProps={{ fontSize: '0.85rem' }} primary={`${item.quantity}x ${item.product?.name || 'N/A'}`} />
                                      {item.wasConsigned && <Chip label="Consigned" size="small" color="info" sx={{ ml: 1, height: 20 }} />}
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
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </>
      )}
    </motion.div>
  );
};

export default ReturnsReport;