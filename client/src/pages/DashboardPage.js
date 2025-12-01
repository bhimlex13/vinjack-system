// client/src/pages/DashboardPage.js
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom'; 
import api from '../api/axios';
import AuthContext from '../context/AuthContext';
import { Bar, Line } from 'react-chartjs-2';
import { 
  Chart, CategoryScale, LinearScale, BarElement, LineElement, 
  PointElement, Title, Tooltip as ChartTooltip, Legend, Filler 
} from 'chart.js';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

// MUI Imports
import {
  Box, Grid, Paper, Typography, ToggleButton, ToggleButtonGroup, Container,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
  Stack, Tooltip, useTheme
} from '@mui/material';

// Icons
import { FaMoneyBillWave, FaShoppingCart, FaWarehouse } from 'react-icons/fa';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import BuildIcon from '@mui/icons-material/Build';
import InventoryIcon from '@mui/icons-material/Inventory';
import CategoryIcon from '@mui/icons-material/Category';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

// Loading Spinner
import LoadingSpinner from '../components/LoadingSpinner';

// Register ChartJS components
Chart.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, ChartTooltip, Legend, Filler);

// --- HELPER: Number Shortening ---
const formatStatValue = (value) => {
  let prefix = '';
  let numberStr = String(value);

  if (numberStr.startsWith('₱')) {
    prefix = '₱';
    numberStr = numberStr.substring(1);
  }

  numberStr = numberStr.replace(/,/g, '');
  const number = parseFloat(numberStr);

  if (isNaN(number)) {
    return { display: value, tooltip: value };
  }

  const isCurrency = prefix === '₱';
  const tooltip = `${prefix}${number.toLocaleString(undefined, {
    maximumFractionDigits: isCurrency ? 2 : 0,
    minimumFractionDigits: isCurrency ? 2 : 0
  })}`;

  let display;
  if (number >= 1_000_000_000) {
    display = `${prefix}${(number / 1_000_000_000).toFixed(1)}B+`;
  } else if (number >= 1_000_000) {
    display = `${prefix}${(number / 1_000_000).toFixed(1)}M+`;
  } else if (number >= 10_000) {
    display = `${prefix}${Math.floor(number / 1000)}K+`;
  } else {
    display = `${prefix}${number.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }

  return { display, tooltip };
};

// --- COMPONENT: StatCard ---
const StatCard = ({ title, value, icon, color, to }) => {
  const { display, tooltip } = formatStatValue(value);
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Tooltip title={<Typography variant="body2">{tooltip}</Typography>} placement="top" arrow>
      <Paper
        component={motion.div}
        whileHover={{ y: -5, boxShadow: theme.shadows[10] }}
        whileTap={{ scale: 0.98 }}
        elevation={2}
        onClick={() => to && navigate(to)} 
        sx={{
          p: 0,
          height: '100%',
          width: '100%',
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
          cursor: to ? 'pointer' : 'default',
          '&:before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '6px',
            height: '100%',
            backgroundColor: `${color}.main`,
            zIndex: 1
          }
        }}
      >
        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', width: '100%', height: '100%' }}>
            <Box 
            sx={{ 
                color: `${color}.main`, 
                fontSize: '2.2rem', 
                mr: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 1.5,
                borderRadius: '50%',
                backgroundColor: (theme) => theme.palette.mode === 'light' ? `${color}.50` : 'rgba(255,255,255,0.05)'
            }}
            >
            {icon}
            </Box>
            
            <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography color="textSecondary" variant="body2" fontWeight={600} textTransform="uppercase" letterSpacing={0.5} gutterBottom>
                {title}
            </Typography>
            <Typography
                variant="h5"
                component="p"
                sx={{
                fontWeight: 800,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: 'text.primary'
                }}
            >
                {display}
            </Typography>
            </Box>
        </Box>
      </Paper>
    </Tooltip>
  );
};

// --- MAIN COMPONENT: DashboardPage ---
const DashboardPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate(); 
  const theme = useTheme();
  
  const [summary, setSummary] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [salesTrend, setSalesTrend] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [pendingPOs, setPendingPOs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('today');

  // Framer Motion Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100, damping: 15 }
    }
  };

  // Helper for clickable styling
  const clickableSx = {
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: theme.shadows[8]
    }
  };

  // Load Preferences
  useEffect(() => {
    if (user?.role === 'Super Admin' || user?.role === 'Admin') {
      const loadPreferences = async () => {
        try {
          if (user.dashboardPreferences?.timeRange) {
             setTimeRange(user.dashboardPreferences.timeRange);
          } else {
             const { data } = await api.get('/users/me');
             if (data.dashboardPreferences?.timeRange) {
                setTimeRange(data.dashboardPreferences.timeRange);
             }
          }
        } catch (error) {
          console.error("Could not load dashboard preferences", error);
        }
      };
      loadPreferences();
    }
  }, [user]);

  // Fetch Data
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const summaryParams = new URLSearchParams({ range: timeRange });

        const [summaryRes, lowStockRes, salesTrendRes, recentActRes, pendingPOsRes] = await Promise.all([
          api.get(`/reports/summary?${summaryParams.toString()}`),
          api.get('/reports/low-stock'),
          api.get(`/reports/sales-trend?range=${timeRange}`),
          api.get(`/reports/recent-activities`),
          api.get('/reports/pending-pos')
        ]);

        setSummary(summaryRes.data);
        setLowStockItems(lowStockRes.data);
        setSalesTrend(salesTrendRes.data);
        setRecentActivities(recentActRes.data);
        setPendingPOs(pendingPOsRes.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
        toast.error("Failed to load dashboard data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [timeRange, user]);

  const handleTimeRangeChange = (_, newTimeRange) => {
    if (newTimeRange !== null) {
      setTimeRange(newTimeRange);
    }
  };

  // --- CHART CONFIGURATION ---
  const getTrendChartTitle = () => {
    switch (timeRange) {
      case 'today': return 'Revenue Trend (Today)';
      case 'week': return 'Revenue Trend (This Week)';
      case 'month': return 'Revenue Trend (This Month)';
      default: return 'Revenue Trend (All Time)';
    }
  };

  const formatTrendChartLabels = (data) => {
    if (!data || data.length === 0) return [];
    const firstLabel = data[0]._id;
    
    if (firstLabel && (firstLabel.includes(':') || /\d{2}:00$/.test(firstLabel))) { 
        // Hourly
        return data.map(d => {
             const hour = parseInt(d._id.split(':')[0], 10);
             const dateObj = new Date();
             dateObj.setHours(hour, 0, 0, 0);
             return dateObj.toLocaleTimeString([], { hour: 'numeric', hour12: true });
        });
    } else if (firstLabel && firstLabel.length === 7) { 
        // Monthly
        return data.map(d => {
            const [year, month] = d._id.split('-');
            const dateObj = new Date(year, month - 1, 2);
            return dateObj.toLocaleDateString("en-US", { month: 'short', year: 'numeric' });
        });
    } else if (firstLabel && firstLabel.length === 10) { 
        // Daily
        return data.map(d => new Date(d._id + 'T12:00:00Z').toLocaleDateString("en-US", { month: 'short', day: 'numeric' }));
    }
    return []; 
  };

  const barChartData = {
     labels: summary?.topSellingProducts?.map(p => p.productInfo?.name?.substring(0, 15) + (p.productInfo?.name?.length > 15 ? '...' : '') || 'N/A') || [],
    datasets: [{
      label: 'Qty Sold',
      data: summary?.topSellingProducts?.map(p => p.totalQuantitySold) || [],
      backgroundColor: 'rgba(54, 162, 235, 0.7)',
      borderRadius: 4,
    }],
  };
  
  const barChartOptions = {
    responsive: true, 
    maintainAspectRatio: false, 
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, grid: { display: false } }, y: { grid: { display: false } } }
  };

  const lineChartData = {
     labels: formatTrendChartLabels(salesTrend),
    datasets: [{
      label: 'Revenue',
      data: salesTrend?.map(d => d.totalSales) || [],
      borderColor: '#2e7d32',
      backgroundColor: (context) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(46, 125, 50, 0.4)');
        gradient.addColorStop(1, 'rgba(46, 125, 50, 0.0)');
        return gradient;
      },
      fill: true, 
      tension: 0.4, 
      pointRadius: 4,
      pointBackgroundColor: '#2e7d32',
      pointBorderColor: '#fff',
      pointBorderWidth: 2
    }]
  };
  
  const lineChartOptions = {
    responsive: true, 
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    scales: { 
        y: { beginAtZero: true, grid: { borderDash: [2, 4] } },
        x: { grid: { display: false } }
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading Dashboard..." />;
  }

  return (
    <Container maxWidth="xl" sx={{ pb: 4 }}>
      {/* Header Section */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 4, gap: 2 }}>
        <Box sx={{ mb: { xs: 2, sm: 0 }, width: { xs: '100%', sm: 'auto' } }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.5px' }}>
            Dashboard
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                Overview of your business performance
            </Typography>
        </Box>

        {/* Filters - Responsive Fix applied here */}
        <Stack 
          direction="row" 
          spacing={1.5} 
          alignItems="center" 
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
            <ToggleButtonGroup 
                color="primary" 
                value={timeRange} 
                exclusive 
                onChange={handleTimeRangeChange} 
                size="small"
                sx={{ 
                    backgroundColor: 'background.paper',
                    boxShadow: 1,
                    width: { xs: '100%', sm: 'auto' }, // Full width on mobile, auto on desktop
                    display: 'flex',
                    '& .MuiToggleButton-root': {
                        border: 'none',
                        borderRadius: '8px !important',
                        px: 2,
                        py: 0.75,
                        margin: '4px',
                        fontWeight: 600,
                        textTransform: 'none',
                        flex: { xs: 1, sm: 'none' }, // Even width on mobile, natural width on desktop
                        '&.Mui-selected': {
                            backgroundColor: 'primary.main',
                            color: 'white',
                            boxShadow: 2
                        }
                    }
                }}
            >
              <ToggleButton value="today">Today</ToggleButton>
              <ToggleButton value="week">Week</ToggleButton>
              <ToggleButton value="month">Month</ToggleButton>
              <ToggleButton value="all">All Time</ToggleButton>
            </ToggleButtonGroup>
        </Stack>
      </Box>

      {/* Main Grid */}
      <Grid 
        container 
        spacing={3}
        component={motion.div}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* --- STAT CARDS --- */}
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} component={motion.div} variants={itemVariants}>
          <StatCard title="Total Revenue" value={`₱${(summary?.totalRevenue)?.toFixed(2) || '0.00'}`} icon={<FaMoneyBillWave />} color="primary" to="/reports" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} component={motion.div} variants={itemVariants}>
          <StatCard title="Total Profit" value={`₱${(summary?.totalProfit)?.toFixed(2) || '0.00'}`} icon={<MonetizationOnIcon />} color="info" to="/reports" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} component={motion.div} variants={itemVariants}>
          <StatCard title="Total Sales" value={summary?.totalSales || 0} icon={<FaShoppingCart />} color="success" to="/transactions" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} component={motion.div} variants={itemVariants}>
          <StatCard title="Items Sold" value={summary?.totalQuantitySold || 0} icon={<ShoppingCartCheckoutIcon />} color="warning" to="/transactions" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} component={motion.div} variants={itemVariants}>
          <StatCard title="Stock Units" value={summary?.totalStockQuantity || 0} icon={<FaWarehouse />} color="error" to="/inventory" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} component={motion.div} variants={itemVariants}>
          <StatCard title="Products (SKUs)" value={summary?.totalSKUs || 0} icon={<InventoryIcon />} color="secondary" to="/inventory" />
        </Grid>

        {/* --- REVENUE TREND CHART (Link to Reports) --- */}
        <Grid size={{ xs: 12 }} component={motion.div} variants={itemVariants}>
          <Paper 
            elevation={2} 
            sx={{ p: 3, display: 'flex', flexDirection: 'column', height: 400, borderRadius: 3, ...clickableSx }}
            onClick={() => navigate('/reports')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'success.light', color: 'success.dark', mr: 1.5, display: 'flex' }}>
                    <ShowChartIcon fontSize="small" />
                </Box>
                <Typography variant="h6" fontWeight={700}>{getTrendChartTitle()}</Typography>
            </Box>
            <Box sx={{ flexGrow: 1, position: 'relative' }}>
              {salesTrend && salesTrend.length > 0 ? (
                <Line options={lineChartOptions} data={lineChartData} />
              ) : (
                <Box sx={{display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', opacity: 0.6 }}>
                  <ShowChartIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body1" color="textSecondary">No sales trend data available.</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* --- TOP 5 SELLING PRODUCTS (Link to Reports) --- */}
        <Grid size={{ xs: 12, md: 6 }} component={motion.div} variants={itemVariants}>
          <Paper 
            elevation={2} 
            sx={{ p: 3, height: 450, display: 'flex', flexDirection: 'column', borderRadius: 3, ...clickableSx }}
            onClick={() => navigate('/reports')}
          >
             <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.dark', mr: 1.5, display: 'flex' }}>
                    <BarChartIcon fontSize="small" />
                </Box>
                <Typography variant="h6" fontWeight={700}>Top 5 Selling Products</Typography>
            </Box>
            <Box sx={{ flexGrow: 1, position: 'relative' }}>
                {summary?.topSellingProducts && summary.topSellingProducts.length > 0 ? (
                    <Bar options={barChartOptions} data={barChartData} />
                ) : (
                    <Box sx={{display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
                      <Typography variant="body2">No product sales data.</Typography>
                    </Box>
                )}
            </Box>
          </Paper>
        </Grid>

        {/* --- TOP 5 SELLING SERVICES (Link to Reports) --- */}
        <Grid size={{ xs: 12, md: 6 }} component={motion.div} variants={itemVariants}>
           <Paper 
             elevation={2} 
             sx={{ p: 0, height: 450, display: 'flex', flexDirection: 'column', borderRadius: 3, overflow: 'hidden', ...clickableSx }}
             onClick={() => navigate('/reports')}
           >
              <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center' }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'info.light', color: 'info.dark', mr: 1.5, display: 'flex' }}>
                    <BuildIcon fontSize="small" />
                </Box>
                <Typography variant="h6" fontWeight={700}>Top 5 Selling Services</Typography>
              </Box>
            <TableContainer sx={{ flexGrow: 1, px: 1 }}>
                 <Table stickyHeader size="medium">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Service Name</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summary?.topSellingServices && summary.topSellingServices.length > 0 ? (
                      summary.topSellingServices.map((service) => (
                        <TableRow key={service._id} hover>
                          <TableCell sx={{ fontWeight: 500 }}>{service.serviceInfo?.name || 'N/A'}</TableCell>
                          <TableCell align="right">
                            <Chip label={service.count} color="info" size="small" sx={{ fontWeight: 600, borderRadius: 1 }} />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} align="center" sx={{ color: 'text.disabled', py: 4 }}>No data available.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* --- SLOW MOVING PRODUCTS (Link to Inventory) --- */}
        <Grid size={{ xs: 12, md: 6 }} component={motion.div} variants={itemVariants}>
          <Paper 
            elevation={2} 
            sx={{ p: 0, height: 450, display: 'flex', flexDirection: 'column', borderRadius: 3, overflow: 'hidden', ...clickableSx }}
            onClick={() => navigate('/inventory')}
          >
             <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center' }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'warning.light', color: 'warning.dark', mr: 1.5, display: 'flex' }}>
                    <TrendingDownIcon fontSize="small" />
                </Box>
                <Typography variant="h6" fontWeight={700}>Slow Moving Products</Typography>
              </Box>
            <TableContainer sx={{ flexGrow: 1, px: 1 }}>
                 <Table stickyHeader size="medium">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Product Name</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>Qty Sold</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summary?.slowMovingProducts && summary.slowMovingProducts.length > 0 ? (
                      summary.slowMovingProducts.map((prod) => (
                        <TableRow key={prod._id} hover>
                          <TableCell sx={{ fontWeight: 500 }}>{prod.productInfo?.name || 'N/A'}</TableCell>
                          <TableCell align="right">
                             <Chip label={prod.totalQuantitySold} color="warning" variant="outlined" size="small" sx={{ fontWeight: 600 }} />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} align="center" sx={{ color: 'text.disabled', py: 4 }}>No slow-moving items.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* --- INVENTORY BY CATEGORY (Link to Inventory) --- */}
        <Grid size={{ xs: 12, md: 6 }} component={motion.div} variants={itemVariants}>
          <Paper 
            elevation={2} 
            sx={{ p: 0, height: 450, display: 'flex', flexDirection: 'column', borderRadius: 3, overflow: 'hidden', ...clickableSx }}
            onClick={() => navigate('/inventory')}
          >
             <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center' }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'secondary.light', color: 'secondary.dark', mr: 1.5, display: 'flex' }}>
                    <CategoryIcon fontSize="small" />
                </Box>
                <Typography variant="h6" fontWeight={700}>Inventory by Category</Typography>
              </Box>
            <TableContainer sx={{ flexGrow: 1, px: 1 }}>
                 <Table stickyHeader size="medium">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Category</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>SKUs</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>Total Qty</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summary?.categorySummary && summary.categorySummary.length > 0 ? (
                      summary.categorySummary.map((cat) => (
                        <TableRow key={cat.categoryName} hover>
                          <TableCell sx={{ fontWeight: 500 }}>{cat.categoryName}</TableCell>
                          <TableCell align="right">{cat.skuCount}</TableCell>
                          <TableCell align="right">
                             <Chip label={cat.totalStock} variant="outlined" size="small" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ color: 'text.disabled', py: 4 }}>No category data.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* --- LOW STOCK ITEMS (Link to Alerts) --- */}
        <Grid size={{ xs: 12, md: 6 }} component={motion.div} variants={itemVariants}>
          <Paper 
            elevation={2} 
            sx={{ p: 0, height: 450, display: 'flex', flexDirection: 'column', borderRadius: 3, overflow: 'hidden', ...clickableSx }}
            onClick={() => navigate('/alerts')}
          >
              <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'error.light', color: 'error.dark', mr: 1.5, display: 'flex' }}>
                    <WarningAmberIcon fontSize="small" />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>Low Stock Items</Typography>
              </Box>
            <TableContainer sx={{ flexGrow: 1, px: 1 }}>
                <Table stickyHeader size="medium">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Product</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>Qty Left</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lowStockItems && lowStockItems.length > 0 ? (lowStockItems.map((item) => (
                      <TableRow key={item._id} hover>
                        <TableCell sx={{ fontWeight: 500 }}>{item.name}</TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={item.quantity} 
                            color={item.quantity === 0 ? "error" : "warning"} 
                            size="small" 
                            variant="filled"
                            sx={{ fontWeight: 700, minWidth: 40 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))) : (
                      <TableRow>
                        <TableCell colSpan={2} align="center" sx={{ color: 'text.disabled', py: 4 }}>All items are sufficiently stocked.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* --- RECENT ACTIVITY (Link to Audit Log) --- */}
        <Grid size={{ xs: 12, md: 6 }} component={motion.div} variants={itemVariants}>
           <Paper 
             elevation={2} 
             sx={{ p: 0, height: 450, display: 'flex', flexDirection: 'column', borderRadius: 3, overflow: 'hidden', ...clickableSx }}
             onClick={() => navigate('/audit-log')}
           >
             <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center' }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'secondary.light', color: 'secondary.dark', mr: 1.5, display: 'flex' }}>
                    <ReceiptLongIcon fontSize="small" />
                </Box>
                <Typography variant="h6" fontWeight={700}>Recent Activity</Typography>
              </Box>
            <TableContainer sx={{ flexGrow: 1, px: 1 }}>
                 <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Details</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>User</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentActivities && recentActivities.length > 0 ? (
                      recentActivities.map((activity) => (
                        <TableRow key={activity.id} hover>
                          <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap', color: 'text.secondary' }}>
                            <Box fontWeight="600">{new Date(activity.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Box>
                            <Box fontSize="0.75rem">{new Date(activity.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={activity.type} 
                              size="small" 
                              variant="outlined" 
                              color={
                                activity.type === 'Sale' ? 'success' :
                                activity.type === 'Delivery' ? 'info' :
                                activity.type === 'Adjustment' ? 'warning' :
                                activity.type === 'Return' ? 'error' : 'default'
                              }
                              sx={{ fontWeight: 600, fontSize: '0.7rem', height: 24 }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.85rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={activity.description}>
                            {activity.description}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{activity.user}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={4} align="center" sx={{ color: 'text.disabled', py: 4 }}>No recent activity.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* --- PENDING PURCHASE ORDERS (Link to POs) --- */}
        <Grid size={{ xs: 12 }} component={motion.div} variants={itemVariants}>
          <Paper 
            elevation={2} 
            sx={{ p: 0, height: 350, display: 'flex', flexDirection: 'column', borderRadius: 3, overflow: 'hidden', ...clickableSx }}
            onClick={() => navigate('/purchase-orders')}
          >
             <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center' }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'text.disabled', color: 'white', mr: 1.5, display: 'flex' }}>
                    <AssignmentIcon fontSize="small" />
                </Box>
                <Typography variant="h6" fontWeight={700}>Pending Purchase Orders</Typography>
              </Box>
            <TableContainer sx={{ flexGrow: 1, px: 2 }}>
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>PO Number</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingPOs && pendingPOs.length > 0 ? (pendingPOs.map((po) => (
                      <TableRow key={po._id} hover>
                        <TableCell sx={{ fontWeight: 500, fontFamily: 'monospace' }}>{po.poNumber}</TableCell>
                        <TableCell>
                          <Chip 
                            label={po.status} 
                            size="small" 
                            color={po.status === 'Pending' ? 'warning' : 'info'} 
                            variant="filled"
                            sx={{ fontWeight: 700, borderRadius: 1 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))) : (
                      <TableRow>
                        <TableCell colSpan={2} align="center" sx={{ color: 'text.disabled', py: 4 }}>No pending orders.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DashboardPage;