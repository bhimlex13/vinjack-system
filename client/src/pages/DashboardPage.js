// client/src/pages/DashboardPage.js
import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Bar, Line } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';

// MUI Imports
import {
  Box,
  Grid,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import { FaMoneyBillWave, FaShoppingCart, FaWarehouse } from 'react-icons/fa';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import BarChartIcon from '@mui/icons-material/BarChart';


Chart.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

// Helper component for Stat Cards
const StatCard = ({ title, value, icon, color }) => (
  <Paper 
    elevation={3} 
    sx={{ 
      p: 2.5, 
      display: 'flex', 
      alignItems: 'center', 
      borderLeft: 5, 
      borderColor: `${color}.main` 
    }}
  >
    <Box sx={{ color: `${color}.main`, fontSize: '2.5rem', mr: 2 }}>{icon}</Box>
    <Box>
      <Typography color="textSecondary" variant="subtitle1" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h5" component="p" sx={{ fontWeight: 'bold' }}>
        {value}
      </Typography>
    </Box>
  </Paper>
);


const DashboardPage = () => {
  const [summary, setSummary] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [salesTrend, setSalesTrend] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [pendingPOs, setPendingPOs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [summaryResponse, lowStockResponse, salesTrendResponse, recentTransactionsResponse, pendingPOsResponse] = await Promise.all([
          api.get(`/reports/summary?range=${timeRange}`),
          api.get('/reports/low-stock'),
          api.get('/reports/sales-trend'),
          api.get('/reports/recent-transactions'),
          api.get('/reports/pending-pos')
        ]);
        setSummary(summaryResponse.data);
        setLowStockItems(lowStockResponse.data);
        setSalesTrend(salesTrendResponse.data);
        setRecentTransactions(recentTransactionsResponse.data);
        setPendingPOs(pendingPOsResponse.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [timeRange]);

  const handleTimeRangeChange = (event, newTimeRange) => {
    if (newTimeRange !== null) {
      setTimeRange(newTimeRange);
    }
  };
  
  const barChartData = {
    labels: summary?.topSellingProducts.map(p => p.productInfo.name.substring(0, 15) + '...') || [],
    datasets: [{
      label: 'Qty Sold',
      data: summary?.topSellingProducts.map(p => p.totalQuantitySold) || [],
      backgroundColor: 'rgba(0, 123, 255, 0.6)',
    }],
  };
  const barChartOptions = {
    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } }
  };
  const lineChartData = {
    labels: salesTrend?.map(d => new Date(d._id).toLocaleDateString("en-US", { month: 'short', day: 'numeric' })) || [],
    datasets: [{
      label: 'Daily Revenue',
      data: salesTrend?.map(d => d.totalSales) || [],
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      fill: true, tension: 0.4, pointBackgroundColor: 'rgb(75, 192, 192)'
    }]
  };
  const lineChartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, title: { display: false } },
    scales: { y: { beginAtZero: true } }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    // --- CHANGE: Use a standard Container with maxWidth for better spacing on large screens ---
    <Container maxWidth="lx" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Dashboard
        </Typography>
        <ToggleButtonGroup color="primary" value={timeRange} exclusive onChange={handleTimeRangeChange}>
          <ToggleButton value="all">All Time</ToggleButton>
          <ToggleButton value="month">Month</ToggleButton>
          <ToggleButton value="week">Week</ToggleButton>
          <ToggleButton value="today">Today</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* --- NEW LAYOUT STRUCTURE START --- */}
      <Grid container spacing={3}>
        {/* Row 1: Stat Cards */}
        <Grid item size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard title="Total Revenue" value={`₱${(summary?.totalRevenue)?.toFixed(2) || '0.00'}`} icon={<FaMoneyBillWave />} color="primary" />
        </Grid>
        <Grid item size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard title="Total Profit" value={`₱${(summary?.totalProfit)?.toFixed(2) || '0.00'}`} icon={<MonetizationOnIcon />} color="info" />
        </Grid>
        <Grid item size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard title="Total Sales" value={summary?.totalSales || 0} icon={<FaShoppingCart />} color="success" />
        </Grid>
        <Grid item size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard title="Total Units in Stock" value={summary?.totalStock || 0} icon={<FaWarehouse />} color="error" />
        </Grid>

        {/* Row 2: Main Chart */}
        <Grid item size= {{xs:12}}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 350 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ShowChartIcon color="action" sx={{ mr: 1 }}/>
                <Typography variant="h6" component="h3">Daily Revenue (Last 30 Days)</Typography>
            </Box>
            <Box sx={{ flexGrow: 1, position: 'relative' }}>
              {salesTrend && salesTrend.length > 0 ? (
                <Line options={lineChartOptions} data={lineChartData} />
              ) : (
                <Box sx={{display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center'}}>
                  <Typography>Not enough data to display sales trend.</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Row 3: Other Charts */}
        
        <Grid item size={{ xs: 12, md: 6 }} sx={{ height: '420px' }}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                <BarChartIcon color="action" sx={{ mr: 1 }}/>
                <Typography variant="h6" component="h3">Top 5 Selling Products</Typography>
            </Box>
            <Box sx={{ flexGrow: 1, position: 'relative' }}>
                <Bar options={barChartOptions} data={barChartData} />
            </Box>
          </Paper>
        </Grid>
        
        <Grid item size={{ xs: 12, md: 6 }} sx={{ height: '420px' }}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                <WarningAmberIcon color="warning" sx={{ mr: 1 }}/>
                <Typography variant="h6" component="h3">Low Stock Items</Typography>
            </Box>
            <TableContainer>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow><TableCell>Product</TableCell><TableCell align="right">Qty</TableCell></TableRow>
                </TableHead>
                <TableBody>
                  {lowStockItems.length > 0 ? (lowStockItems.map((item) => (
                    <TableRow key={item._id} hover>
                      <TableCell>{item.name}</TableCell>
                      <TableCell align="right"><Chip label={item.quantity} color={item.quantity === 0 ? "error" : "warning"} size="small"/></TableCell>
                    </TableRow>
                  ))) : (<TableRow><TableCell colSpan={2} align="center">All items are in stock.</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item size={{ xs: 12, md: 6 }} sx={{ height: '420px' }}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
              <ReceiptLongIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" component="h3">Recent Transactions</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow><TableCell>Time</TableCell><TableCell align="right">Amount</TableCell></TableRow>
                </TableHead>
                <TableBody>
                  {recentTransactions.length > 0 ? (recentTransactions.map((sale) => (
                    <TableRow key={sale._id} hover>
                      <TableCell>{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                      <TableCell align="right">{`₱${sale.totalAmount.toFixed(2)}`}</TableCell>
                    </TableRow>
                  ))) : (<TableRow><TableCell colSpan={2} align="center">No recent transactions.</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        
        <Grid item size={{ xs: 12, md: 6 }} sx={{ height: '420px' }}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
              <AssignmentIcon color="secondary" sx={{ mr: 1 }} />
              <Typography variant="h6" component="h3">Pending Purchase Orders</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow><TableCell>PO Number</TableCell><TableCell>Status</TableCell></TableRow>
                </TableHead>
                <TableBody>
                  {pendingPOs.length > 0 ? (pendingPOs.map((po) => (
                    <TableRow key={po._id} hover>
                      <TableCell>{po.poNumber}</TableCell>
                      <TableCell><Chip label={po.status} size="small" color={po.status === 'Pending' ? 'warning' : 'info'} /></TableCell>
                    </TableRow>
                  ))) : (<TableRow><TableCell colSpan={2} align="center">No pending orders.</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>


      </Grid>
      {/* --- NEW LAYOUT STRUCTURE END --- */}
    </Container>
  );
};

export default DashboardPage;