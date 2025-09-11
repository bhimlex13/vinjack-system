// client/src/pages/ReportsPage.js
import React, { useState, useMemo } from 'react';
import api from '../api/axios';

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
  Container 
} from '@mui/material';

const ReportsPage = () => {
  const today = new Date().toISOString().split('T')[0];

  const [reportData, setReportData] = useState([]);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [wasGenerated, setWasGenerated] = useState(false);

  const reportSummary = useMemo(() => {
    if (reportData.length === 0) {
      return { totalRevenue: 0, totalCost: 0, totalProfit: 0 };
    }
    const totalRevenue = reportData.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalCost = reportData.reduce((sum, sale) => {
      const saleCost = sale.items.reduce((itemSum, item) => {
        return itemSum + (item.costAtTime || 0) * item.quantity;
      }, 0);
      return sum + saleCost;
    }, 0);
    const totalProfit = totalRevenue - totalCost;
    return { totalRevenue, totalCost, totalProfit };
  }, [reportData]);

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      setError('Please select both a start and end date.');
      return;
    }
    setError('');
    setIsLoading(true);
    setWasGenerated(true);
    setReportData([]);
    try {
      const response = await api.get(`/reports/sales?startDate=${startDate}&endDate=${endDate}`);
      setReportData(response.data);
    } catch (err) {
      setError('Failed to generate report.');
    } finally {
      setIsLoading(false);
    }
  };

  const SummaryCard = ({ title, value, profit = false }) => (
    <Grid item xs={12} sm={4}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" color="text.secondary">{title}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: profit ? 'success.main' : 'text.primary' }}>
          {`₱${value.toFixed(2)}`}
        </Typography>
      </Paper>
    </Grid>
  );

  return (
    // --- THIS IS THE KEY CHANGE ---
    <Container maxWidth="xl" sx={{ p: 3, mt: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
        Sales & Profitability Report
      </Typography>

      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
        <TextField
          label="End Date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
        <Button variant="contained" onClick={handleGenerateReport} disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Report'}
        </Button>
      </Paper>

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
                    <TableCell sx={{ fontWeight: 'bold' }}>Items Sold</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Recorded By</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Total Revenue</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Total Profit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.map((sale) => {
                    const saleCost = sale.items.reduce((sum, item) => sum + (item.costAtTime || 0) * item.quantity, 0);
                    const saleProfit = sale.totalAmount - saleCost;
                    
                    return (
                      <TableRow key={sale._id}>
                        <TableCell>{new Date(sale.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <List dense disablePadding>
                            {sale.items.map(item => (
                              <ListItem key={item._id} disableGutters sx={{ p: 0 }}>
                                <ListItemText primary={`${item.quantity}x ${item.product?.name || 'N/A'}`} />
                              </ListItem>
                            ))}
                          </List>
                        </TableCell>
                        <TableCell>{sale.recordedBy?.fullName || 'N/A'}</TableCell>
                        <TableCell>{`₱${sale.totalAmount.toFixed(2)}`}</TableCell>
                        <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>
                          {`₱${saleProfit.toFixed(2)}`}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">No sales data found for the selected period.</Alert>
          )}
        </>
      )}
    </Container>
  );
};

export default ReportsPage;