// client/src/pages/DashboardPage.js
import React, { useEffect, useState, useContext } from 'react';
import api from '../api/axios';
import AuthContext from '../context/AuthContext';
import { Bar, Line } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { toast } from 'react-toastify'; // --- NEW: Import toast ---

// MUI Imports
import {
  Box, Grid, Paper, Typography, ToggleButton, ToggleButtonGroup, CircularProgress, Container,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
  FormControl, InputLabel, Select, MenuItem, Stack,
  Button // --- NEW: Import Button ---
} from '@mui/material';
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
import FilterListIcon from '@mui/icons-material/FilterList';
import SaveIcon from '@mui/icons-material/Save'; // --- NEW: Import SaveIcon ---


Chart.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

// Helper component for Stat Cards (No change)
const StatCard = ({ title, value, icon, color }) => (
  <Paper
    elevation={3}
    sx={{ p: 2.5, display: 'flex', alignItems: 'center', borderLeft: 5, borderColor: `${color}.main`, height: '100%' }}
  >
    <Box sx={{ color: `${color}.main`, fontSize: '2.5rem', mr: 2 }}>{icon}</Box>
    <Box>
      <Typography color="textSecondary" variant="subtitle1" gutterBottom>{title}</Typography>
      <Typography variant="h5" component="p" sx={{ fontWeight: 'bold' }}>{value}</Typography>
    </Box>
  </Paper>
);


const DashboardPage = () => {
  const { user } = useContext(AuthContext);
  const [summary, setSummary] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [salesTrend, setSalesTrend] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [pendingPOs, setPendingPOs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- MODIFIED: These states will now be set by user preferences ---
  const [timeRange, setTimeRange] = useState('all'); 
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [isFilterDataLoading, setIsFilterDataLoading] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false); // --- NEW: State for save button
  // --- END MODIFICATION ---


  // --- NEW: Load user preferences on mount (for Owner) ---
  useEffect(() => {
    if (user?.role === 'Owner') {
      const loadPreferences = async () => {
        try {
          // Preferences are now part of the /me route or login context
          // Let's use the user object from context first
          if (user.dashboardPreferences) {
             const prefs = user.dashboardPreferences;
             if (prefs.timeRange) setTimeRange(prefs.timeRange);
             if (prefs.selectedCategory) setSelectedCategory(prefs.selectedCategory);
             if (prefs.selectedSupplier) setSelectedSupplier(prefs.selectedSupplier);
          } else {
            // Fallback to fetch /me if not on user object (e.g. from older local storage)
             const { data } = await api.get('/users/me');
             if (data.dashboardPreferences) {
                const prefs = data.dashboardPreferences;
                if (prefs.timeRange) setTimeRange(prefs.timeRange);
                if (prefs.selectedCategory) setSelectedCategory(prefs.selectedCategory);
                if (prefs.selectedSupplier) setSelectedSupplier(prefs.selectedSupplier);
             }
          }
        } catch (error) {
          console.error("Could not load dashboard preferences", error);
        }
      };
      loadPreferences();
    }
  }, [user]); // Runs when user is available
  // --- END NEW ---

  // useEffect to load filter dropdown data (No change)
  useEffect(() => {
    if (user?.role === 'Owner') {
      const fetchFilterData = async () => {
        setIsFilterDataLoading(true);
        try {
          const [catRes, supRes] = await Promise.all([
            api.get('/categories'),
            api.get('/suppliers')
          ]);
          setCategories(catRes.data || []);
          setSuppliers(supRes.data || []);
        } catch (error) {
          console.error("Failed to load filter data:", error);
        } finally {
          setIsFilterDataLoading(false);
        }
      };
      fetchFilterData();
    }
  }, [user]);

  // Main data fetching effect
  useEffect(() => {
    // Only fetch if user is loaded
    if (!user) return; 

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // --- MODIFIED: Add supplierId to params ---
        const summaryParams = new URLSearchParams({ range: timeRange });
        if (selectedCategory) summaryParams.append('categoryId', selectedCategory);
        if (selectedSupplier) summaryParams.append('supplierId', selectedSupplier); // <-- UNCOMMENTED

        const [summaryResponse, lowStockResponse, salesTrendResponse, recentActivitiesResponse, pendingPOsResponse] = await Promise.all([
          api.get(`/reports/summary?${summaryParams.toString()}`),
          api.get('/reports/low-stock'),
          api.get(`/reports/sales-trend?range=${timeRange}`),
          api.get(`/reports/recent-activities`),
          api.get('/reports/pending-pos')
        ]);
        // --- END MODIFICATION ---

        setSummary(summaryResponse.data);
        setLowStockItems(lowStockResponse.data);
        setSalesTrend(salesTrendResponse.data);
        setRecentActivities(recentActivitiesResponse.data);
        setPendingPOs(pendingPOsResponse.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
        // Add toast for error
        toast.error("Failed to load dashboard data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [timeRange, selectedCategory, selectedSupplier, user]); // Add user as dependency

  // handleTimeRangeChange (No change)
  const handleTimeRangeChange = (event, newTimeRange) => {
    if (newTimeRange !== null) {
      setTimeRange(newTimeRange);
    }
  };

  // Filter change handlers (No change)
  const handleCategoryChange = (event) => {
      setSelectedCategory(event.target.value);
  };

  const handleSupplierChange = (event) => {
      setSelectedSupplier(event.target.value);
  };
  
  // --- NEW: Save user preferences ---
  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    try {
      await api.put('/users/dashboard-preferences', {
        timeRange,
        selectedCategory,
        selectedSupplier
      });
      toast.success('Preferences saved!');
    } catch (error) {
      console.error("Failed to save preferences", error);
      toast.error('Could not save preferences.');
    } finally {
      setIsSavingPrefs(false);
    }
  };
  // --- END NEW ---


  // Chart functions (getTrendChartTitle, formatTrendChartLabels, barChartData, barChartOptions, lineChartData, lineChartOptions)
  // ... (Keep all these functions as they are, no changes needed) ...
  // getTrendChartTitle (Keep as is)
  const getTrendChartTitle = () => { /* ... */
    switch (timeRange) {
      case 'today': return 'Revenue Trend (Today)';
      case 'week': return 'Revenue Trend (This Week)';
      case 'month': return 'Revenue Trend (This Month)';
      default: return 'Revenue Trend (All Time)';
    }
  };

  // formatTrendChartLabels (Keep as is)
  const formatTrendChartLabels = (data) => { /* ... */
    if (!data || data.length === 0) return [];
    const firstLabel = data[0]._id;
     if (firstLabel && (firstLabel.includes(':') || /\d{2}:00$/.test(firstLabel))) { // Hourly format check
        return data.map(d => {
             const hourPart = d._id.slice(-5); // Get "HH:00" or similar
             const hour = parseInt(hourPart.split(':')[0], 10);
             const dateObj = new Date(); // Use current date as base
             dateObj.setHours(hour, 0, 0, 0); // Set the hour
             return dateObj.toLocaleTimeString([], { hour: 'numeric', hour12: true });
        });
    } else if (firstLabel && firstLabel.length === 7) { // Monthly: YYYY-MM
        return data.map(d => {
            const [year, month] = d._id.split('-');
            const dateObj = new Date(year, month - 1, 2); // Use day 2
            return dateObj.toLocaleDateString("en-US", { month: 'long', year: 'numeric' });
        });
    } else if (firstLabel && firstLabel.length === 10) { // Daily: YYYY-MM-DD
        return data.map(d => new Date(d._id + 'T12:00:00Z').toLocaleDateString("en-US", { month: 'short', day: 'numeric' }));
    }
    console.warn("Unrecognized label format in sales trend:", firstLabel);
    return []; // Fallback for unrecognized format
  };

  // barChartData for Top Products (Keep as is)
  const barChartData = { /* ... */
     labels: summary?.topSellingProducts?.map(p => p.productInfo?.name?.substring(0, 15) + (p.productInfo?.name?.length > 15 ? '...' : '') || 'N/A') || [],
    datasets: [{
      label: 'Qty Sold',
      data: summary?.topSellingProducts?.map(p => p.totalQuantitySold) || [],
      backgroundColor: 'rgba(0, 123, 255, 0.6)',
    }],
  };
  const barChartOptions = { /* ... */
     responsive: true, maintainAspectRatio: false, indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true }, y: { ticks: { autoSkip: false } } }
  };

  // lineChartData for Sales Trend (Keep as is)
  const lineChartData = { /* ... */
     labels: formatTrendChartLabels(salesTrend),
    datasets: [{
      label: 'Revenue',
      data: salesTrend?.map(d => d.totalSales) || [],
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      fill: true, tension: 0.4, pointBackgroundColor: 'rgb(75, 192, 192)'
    }]
  };
  const lineChartOptions = { /* ... */
     responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, title: { display: false } },
    scales: { y: { beginAtZero: true } }
  };


  if (isLoading || (user?.role === 'Owner' && isFilterDataLoading)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // --- NEW: Check if user is null after initialization ---
  if (!user) {
    return (
       <Container maxWidth="lx" sx={{ mt: 4, mb: 4 }}>
         <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 3 }}>
            Dashboard
         </Typography>
         <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6">Please log in to view the dashboard.</Typography>
         </Paper>
       </Container>
    );
  }
  // --- END NEW ---

  return (
    <Container maxWidth="lx" sx={{ mt: 4, mb: 4 }}>
      {/* Header, Time Range Toggle, AND NEW FILTERS */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mr: 2 }}>
          Dashboard
        </Typography>

        {/* --- MODIFIED: Filter Stack --- */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="center">
            {/* Owner Only Filters */}
            {user?.role === 'Owner' && (
              <>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel id="category-filter-label">Category</InputLabel>
                  <Select
                    labelId="category-filter-label"
                    value={selectedCategory}
                    label="Category"
                    onChange={handleCategoryChange}
                    startAdornment={<FilterListIcon sx={{ mr: 1, color: 'action.active' }} />}
                  >
                    <MenuItem value=""><em>All Categories</em></MenuItem>
                    {categories.map((cat) => (
                      <MenuItem key={cat._id} value={cat._id}>{cat.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* --- MODIFIED: Supplier Filter (UNCOMMENTED) --- */}
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel id="supplier-filter-label">Supplier</InputLabel>
                  <Select
                    labelId="supplier-filter-label"
                    value={selectedSupplier}
                    label="Supplier"
                    onChange={handleSupplierChange}
                    startAdornment={<FilterListIcon sx={{ mr: 1, color: 'action.active' }} />}
                  >
                    <MenuItem value=""><em>All Suppliers</em></MenuItem>
                    {suppliers.map((sup) => (
                      <MenuItem key={sup._id} value={sup._id}>{sup.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {/* --- END MODIFICATION --- */}
              </>
            )}

            {/* Time Range Filter (Visible to all) */}
            <ToggleButtonGroup color="primary" value={timeRange} exclusive onChange={handleTimeRangeChange} size="small">
              <ToggleButton value="all">All Time</ToggleButton>
              <ToggleButton value="month">Month</ToggleButton>
              <ToggleButton value="week">Week</ToggleButton>
              <ToggleButton value="today">Today</ToggleButton>
            </ToggleButtonGroup>

            {/* --- NEW: Save Preferences Button --- */}
            {user?.role === 'Owner' && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<SaveIcon />}
                onClick={handleSavePreferences}
                disabled={isSavingPrefs}
                sx={{ height: '40px' }} // Match toggle button height
              >
                {isSavingPrefs ? <CircularProgress size={24} /> : 'Save View'}
              </Button>
            )}
        </Stack>
        {/* --- END Filter Stack --- */}
      </Box>

      {/* ... (Rest of the JSX remains exactly the same) ... */}
      <Grid container spacing={3}>
        {/* Row 1: Stat Cards (Keep as is) */}
        <Grid item size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <StatCard title="Total Revenue" value={`₱${(summary?.totalRevenue)?.toFixed(2) || '0.00'}`} icon={<FaMoneyBillWave />} color="primary" />
        </Grid>
        <Grid item size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <StatCard title="Total Profit" value={`₱${(summary?.totalProfit)?.toFixed(2) || '0.00'}`} icon={<MonetizationOnIcon />} color="info" />
        </Grid>
        <Grid item size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <StatCard title="Total Sales" value={summary?.totalSales || 0} icon={<FaShoppingCart />} color="success" />
        </Grid>
        <Grid item size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <StatCard title="Total Items Sold" value={summary?.totalQuantitySold || 0} icon={<ShoppingCartCheckoutIcon />} color="success" />
        </Grid>
        <Grid item size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <StatCard title="Total Units in Stock" value={summary?.totalStockQuantity || 0} icon={<FaWarehouse />} color="error" />
        </Grid>
        <Grid item size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <StatCard title="Product Types (SKUs)" value={summary?.totalSKUs || 0} icon={<InventoryIcon />} color="secondary" />
        </Grid>

        {/* Row 2: Main Chart (Keep as is) */}
        <Grid item size={{ xs: 12 }}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 350 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ShowChartIcon color="action" sx={{ mr: 1 }}/>
                <Typography variant="h6" component="h3">{getTrendChartTitle()}</Typography>
            </Box>
            <Box sx={{ flexGrow: 1, position: 'relative' }}>
              {salesTrend && salesTrend.length > 0 ? (
                <Line options={lineChartOptions} data={lineChartData} />
              ) : (
                <Box sx={{display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center'}}>
                  <Typography>No sales data to display trend for this period.</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Other Widgets (Keep structure, content as is) */}
        {/* Top 5 Selling Products */}
        <Grid item size={{ xs: 12, md: 6 }} sx={{ height: '420px' }}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* ... title ... */}
             <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                <BarChartIcon color="action" sx={{ mr: 1 }}/>
                <Typography variant="h6" component="h3">Top 5 Selling Products</Typography>
            </Box>
            <Box sx={{ flexGrow: 1, position: 'relative', overflowY: 'auto' }}>
                {summary?.topSellingProducts && summary.topSellingProducts.length > 0 ? (
                    <Bar options={barChartOptions} data={barChartData} />
                ) : (
                    <Box sx={{display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center'}}>
                      <Typography>No product sales data for this period.</Typography>
                    </Box>
                )}
            </Box>
          </Paper>
        </Grid>
        {/* Top 5 Selling Services */}
        <Grid item size={{ xs: 12, md: 6 }} sx={{ height: '420px' }}>
           <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
             {/* ... title ... */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                <BuildIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6" component="h3">Top 5 Selling Services</Typography>
              </Box>
            <TableContainer sx={{ flexGrow: 1 }}>
                {/* ... table content ... */}
                 <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Service Name</TableCell>
                      <TableCell align="right">Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summary?.topSellingServices && summary.topSellingServices.length > 0 ? (
                      summary.topSellingServices.map((service) => (
                        <TableRow key={service._id} hover>
                          <TableCell>{service.serviceInfo?.name || 'N/A'}</TableCell>
                          <TableCell align="right">
                            <Chip label={service.count} color="info" variant="outlined" size="small" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} align="center">No service sales data for this period.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
            </TableContainer>
          </Paper>
        </Grid>
        {/* Slow Moving Products */}
        <Grid item size={{ xs: 12, md: 6 }} sx={{ height: '420px' }}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* ... title ... */}
             <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                <TrendingDownIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6" component="h3">Slow Moving Products</Typography>
              </Box>
            <TableContainer sx={{ flexGrow: 1 }}>
                {/* ... table content ... */}
                 <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product Name</TableCell>
                      <TableCell align="right">Qty Sold</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summary?.slowMovingProducts && summary.slowMovingProducts.length > 0 ? (
                      summary.slowMovingProducts.map((prod) => (
                        <TableRow key={prod._id} hover>
                          <TableCell>{prod.productInfo?.name || 'N/A'}</TableCell>
                          <TableCell align="right">
                             <Chip label={prod.totalQuantitySold} color="warning" variant="outlined" size="small" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} align="center">No slow-moving product data for this period.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
            </TableContainer>
          </Paper>
        </Grid>
        {/* Inventory by Category Summary */}
        <Grid item size={{ xs: 12, md: 6 }} sx={{ height: '420px' }}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* ... title ... */}
             <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                <CategoryIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="h3">Inventory by Category</Typography>
              </Box>
            <TableContainer sx={{ flexGrow: 1 }}>
                {/* ... table content ... */}
                 <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category Name</TableCell>
                      <TableCell align="right">SKUs</TableCell>
                      <TableCell align="right">Total Qty</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summary?.categorySummary && summary.categorySummary.length > 0 ? (
                      summary.categorySummary.map((cat) => (
                        <TableRow key={cat.categoryName} hover>
                          <TableCell sx={{ fontWeight: 'medium' }}>{cat.categoryName}</TableCell>
                          <TableCell align="right">
                             {cat.skuCount}
                          </TableCell>
                          <TableCell align="right">
                             <Chip label={cat.totalStock} variant="outlined" size="small" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center">No category data available.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
            </TableContainer>
          </Paper>
        </Grid>
        {/* Low Stock Items */}
        <Grid item size={{ xs: 12, md: 6 }} sx={{ height: '420px' }}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
             {/* ... title ... */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                  <WarningAmberIcon color="warning" sx={{ mr: 1 }}/>
                  <Typography variant="h6" component="h3">Low Stock Items</Typography>
              </Box>
            <TableContainer sx={{ flexGrow: 1 }}>
               {/* ... table content ... */}
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow><TableCell>Product</TableCell><TableCell align="right">Qty Left</TableCell></TableRow>
                  </TableHead>
                  <TableBody>
                    {lowStockItems && lowStockItems.length > 0 ? (lowStockItems.map((item) => (
                      <TableRow key={item._id} hover>
                        <TableCell>{item.name}</TableCell>
                        <TableCell align="right"><Chip label={item.quantity} color={item.quantity === 0 ? "error" : "warning"} size="small"/></TableCell>
                      </TableRow>
                    ))) : (<TableRow><TableCell colSpan={2} align="center">All items are sufficiently stocked.</TableCell></TableRow>)}
                  </TableBody>
                </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Recent Activities Section */}
        <Grid item size={{ xs: 12, md: 6 }} sx={{ height: '420px' }}>
           <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* ... title ... */}
             <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                <ReceiptLongIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="h3">Recent Activity</Typography>
              </Box>
            <TableContainer sx={{ flexGrow: 1 }}>
                {/* ... table content ... */}
                 <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Details</TableCell>
                      <TableCell>User</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentActivities && recentActivities.length > 0 ? (
                      recentActivities.map((activity) => (
                        <TableRow key={activity.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            {new Date(activity.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            {new Date(activity.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </TableCell>
                          <TableCell>
                            <Chip label={activity.type} size="small" variant="outlined" color={
                                activity.type === 'Sale' ? 'success' :
                                activity.type === 'Delivery' ? 'info' :
                                activity.type === 'Adjustment' ? 'warning' :
                                activity.type === 'Return' ? 'error' : 'default'
                            } />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={activity.description}>
                            {activity.description}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{activity.user}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={5} align="center">No recent activity.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
            </TableContainer>
          </Paper>
        </Grid>
        {/* Pending Purchase Orders */}
        <Grid item size={{ xs: 12, md: 6 }} sx={{ height: '420px' }}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* ... title ... */}
             <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                <AssignmentIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="h3">Pending Purchase Orders</Typography>
              </Box>
            <TableContainer sx={{ flexGrow: 1 }}>
               {/* ... table content ... */}
                <Table size="small">
                  <TableHead>
                    <TableRow><TableCell>PO Number</TableCell><TableCell>Status</TableCell></TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingPOs && pendingPOs.length > 0 ? (pendingPOs.map((po) => (
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
    </Container>
  );
};

export default DashboardPage;