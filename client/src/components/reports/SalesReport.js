// client/src/components/reports/SalesReport.js
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
  TableContainer, TableHead, TableRow, Alert, Box, Autocomplete, FormControl, 
  InputLabel, Select, MenuItem, ButtonGroup, Stack, Chip
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import FilterAltIcon from '@mui/icons-material/FilterAlt';

// Icons for Stat Cards
import { FaMoneyBillWave, FaCoins, FaChartLine } from 'react-icons/fa';

import LoadingSpinner from '../LoadingSpinner';

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

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [users, setUsers] = useState([]);
  const [isFilterLoading, setIsFilterLoading] = useState(true);

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } }
  };

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

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const reportSummary = useMemo(() => {
    if (reportData.length === 0) return { totalRevenue: 0, totalCost: 0, totalProfit: 0 };
    const totalRevenue = reportData.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalCost = reportData.reduce((sum, sale) => {
      const saleCost = sale.items.reduce((itemSum, item) => itemSum + (item.costOfGoodsSold || 0) * item.quantity, 0);
      return sum + saleCost;
    }, 0);
    const totalProfit = totalRevenue - totalCost;
    return { totalRevenue, totalCost, totalProfit };
  }, [reportData]);

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

  const getFilterSummary = () => {
    let filters = [];
    if (datePreset === 'all') filters.push('Date: All Time');
    else if (format(startDate, 'MM/dd/yyyy') === format(endDate, 'MM/dd/yyyy')) filters.push(`Date: ${format(startDate, 'MM/dd/yyyy')}`);
    else filters.push(`Date Range: ${format(startDate, 'MM/dd/yyyy')} - ${format(endDate, 'MM/dd/yyyy')}`);

    if (filterCustomer) filters.push(`Customer: ${filterCustomer.name}`);
    if (filterProduct) filters.push(`Product: ${filterProduct.name}`);
    if (filterSupplier) filters.push(`Supplier: ${filterSupplier.name}`);
    if (filterUser) filters.push(`User: ${filterUser.fullName}`);
    return filters.join(' | ');
  };
  
  const handleDownloadPDF = () => {
    if (reportData.length === 0) {
      toast.warn("No data to download.");
      return;
    }
    const doc = new jsPDF();
    const filename = `sales_report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.setProperties({ title: filename });

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
    doc.text(`Filters: ${getFilterSummary()}`, 14, 30);

    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 35 });
    
    const finalY = doc.lastAutoTable.finalY || 50;
    doc.setFontSize(12);
    doc.text("Summary", 14, finalY + 15);
    doc.setFontSize(10);
    doc.text(`Total Revenue: P${totalRevenue.toFixed(2)}`, 14, finalY + 22);
    doc.text(`Total Cost of Goods: P${totalCost.toFixed(2)}`, 14, finalY + 29);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Gross Profit: P${totalProfit.toFixed(2)}`, 14, finalY + 36);

    doc.output('dataurlnewwindow');
  };

  // --- Summary Card ---
  const SummaryCard = ({ title, value, color, icon }) => (
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
          position: 'relative',
          overflow: 'hidden',
          '&:before': {
            content: '""',
            position: 'absolute',
            top: 0, left: 0, width: '6px', height: '100%',
            backgroundColor: `${color}.main`
          }
        }}
      >
        <Box sx={{ p: 2, borderRadius: '50%', bgcolor: `${color}.50`, color: `${color}.main`, mr: 2 }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" color="textSecondary" fontWeight={600} textTransform="uppercase">{title}</Typography>
          <Typography variant="h5" fontWeight={800}>
            {`₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </Typography>
        </Box>
      </Paper>
    </Grid>
  );

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {/* Filters Section */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
           <FilterAltIcon color="action" sx={{ mr: 1 }} />
           <Typography variant="h6" fontWeight={700}>Report Filters</Typography>
        </Box>
        
        {isFilterLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <LoadingSpinner text="Loading Filters..." />
          </Box>
        ) : (
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, lg: 7 }}>
              <Box sx={{ overflowX: 'auto', pb: 0.5, whiteSpace: 'nowrap' }}>
                <ButtonGroup fullWidth variant="outlined" size="medium">
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
              </Box>
            </Grid>
            
            <Grid size={{ xs: 12, lg: 5 }}>
              <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', lg: 'flex-end' }}>
                <Button 
                  variant="outlined" color="primary" fullWidth startIcon={<DownloadIcon />} 
                  onClick={handleDownloadCSV} disabled={isLoading || reportData.length === 0}
                >
                  CSV
                </Button>
                <Button 
                  variant="contained" color="secondary" fullWidth startIcon={<PictureAsPdfIcon />} 
                  onClick={handleDownloadPDF} disabled={isLoading || reportData.length === 0}
                >
                  PDF
                </Button>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Autocomplete
                options={products}
                getOptionLabel={(option) => `${option.name} (${option.itemCode})`}
                value={filterProduct}
                onChange={(e, newValue) => { setFilterProduct(newValue); if(newValue) setFilterSupplier(null); }}
                isOptionEqualToValue={(o, v) => o._id === v._id}
                renderInput={(params) => <TextField {...params} label="Product" size="small" />}
                disabled={!!filterSupplier}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Autocomplete
                options={suppliers}
                getOptionLabel={(option) => option.name}
                value={filterSupplier}
                onChange={(e, newValue) => { setFilterSupplier(newValue); if(newValue) setFilterProduct(null); }}
                isOptionEqualToValue={(o, v) => o._id === v._id}
                renderInput={(params) => <TextField {...params} label="Supplier" size="small" />}
                disabled={!!filterProduct}
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
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>User</InputLabel>
                <Select
                  value={filterUser ? filterUser._id : ''}
                  label="User"
                  onChange={(e) => setFilterUser(users.find(u => u._id === e.target.value) || null)}
                >
                  <MenuItem value=""><em>All Users</em></MenuItem>
                  {users.map(user => <MenuItem key={user._id} value={user._id}>{user.fullName}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        )}
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {isLoading ? (
        <Box sx={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <LoadingSpinner text="Generating Report..." />
        </Box>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <SummaryCard title="Total Revenue" value={reportSummary.totalRevenue} color="primary" icon={<FaMoneyBillWave size={24} />} />
            <SummaryCard title="Cost of Goods" value={reportSummary.totalCost} color="warning" icon={<FaCoins size={24} />} />
            <SummaryCard title="Gross Profit" value={reportSummary.totalProfit} color="success" icon={<FaChartLine size={24} />} />
          </Grid>

          <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.100', verticalAlign: 'middle' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.100', verticalAlign: 'middle' }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.100', verticalAlign: 'middle' }}>Items / Services</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'grey.100', verticalAlign: 'middle' }}>Recorded By</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'grey.100', verticalAlign: 'middle' }}>Revenue</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'grey.100', verticalAlign: 'middle' }}>Profit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.length > 0 ? reportData.map((sale) => {
                    const saleCost = sale.items.reduce((sum, item) => sum + (item.costOfGoodsSold || 0) * item.quantity, 0);
                    const saleProfit = sale.totalAmount - saleCost;
                    
                    return (
                      <TableRow key={sale._id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          <Typography variant="body2" fontWeight={600}>{new Date(sale.createdAt).toLocaleDateString()}</Typography>
                          <Typography variant="caption" color="textSecondary">{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
                        </TableCell>
                        <TableCell sx={{ verticalAlign: 'middle' }}>{sale.customer?.name || 'Walk-in'}</TableCell>
                        <TableCell sx={{ verticalAlign: 'middle' }}>
                           <Box sx={{ maxHeight: 80, overflowY: 'auto', pr: 1 }}>
                            {sale.items.map((item, idx) => (
                                <Box key={`i-${idx}`} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', mb: 0.5 }}>
                                    <span><b>{item.quantity}x</b> {item.product?.name || 'Unknown'}</span>
                                </Box>
                            ))}
                            {sale.services.map((svc, idx) => (
                                <Box key={`s-${idx}`} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'info.main' }}>
                                    <span><b>1x</b> {svc.service?.name || 'Unknown'} (Svc)</span>
                                </Box>
                            ))}
                           </Box>
                        </TableCell>
                        <TableCell sx={{ verticalAlign: 'middle' }}>{sale.recordedBy?.fullName || 'N/A'}</TableCell>
                        <TableCell align="right" sx={{ verticalAlign: 'middle' }}>{`₱${sale.totalAmount.toFixed(2)}`}</TableCell>
                        <TableCell align="right" sx={{ verticalAlign: 'middle' }}>
                          <Chip 
                            label={`₱${saleProfit.toFixed(2)}`} 
                            size="small" 
                            color={saleProfit >= 0 ? "success" : "error"} 
                            variant="outlined"
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6, verticalAlign: 'middle' }}>
                        <Typography color="textSecondary">No sales records found for this period.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </motion.div>
  );
};

export default SalesReport;