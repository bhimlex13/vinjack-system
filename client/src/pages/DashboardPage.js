// client/src/pages/DashboardPage.js
import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Bar } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

// MUI Imports
import {
  Box,
  Grid,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Container
} from '@mui/material';
import { FaMoneyBillWave, FaShoppingCart, FaBoxOpen, FaWarehouse } from 'react-icons/fa';


Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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
    <Box sx={{ color: `${color}.main`, fontSize: '3rem', mr: 2 }}>{icon}</Box>
    <Box>
      <Typography color="textSecondary" variant="subtitle1" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
        {value}
      </Typography>
    </Box>
  </Paper>
);


const DashboardPage = () => {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => {
    const fetchSummary = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/reports/summary?range=${timeRange}`);
        setSummary(response.data);
      } catch (error) {
        console.error("Failed to fetch dashboard summary", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSummary();
  }, [timeRange]);

  const handleTimeRangeChange = (event, newTimeRange) => {
    if (newTimeRange !== null) {
      setTimeRange(newTimeRange);
    }
  };

  const chartData = {
    labels: summary?.topSellingProducts.map(p => p.productInfo.name) || [],
    datasets: [
      {
        label: 'Total Quantity Sold',
        data: summary?.topSellingProducts.map(p => p.totalQuantitySold) || [],
        backgroundColor: 'rgba(0, 123, 255, 0.6)',
        borderColor: 'rgba(0, 123, 255, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: `Top 5 Selling Products`, font: { size: 18 } },
    },
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
    <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Dashboard
        </Typography>
        <ToggleButtonGroup
          color="primary"
          value={timeRange}
          exclusive
          onChange={handleTimeRangeChange}
          aria-label="Time range"
        >
          <ToggleButton value="all">All Time</ToggleButton>
          <ToggleButton value="month">Month</ToggleButton>
          <ToggleButton value="week">Week</ToggleButton>
          <ToggleButton value="today">Today</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Revenue" value={`₱${summary?.totalRevenue.toFixed(2) || '0.00'}`} icon={<FaMoneyBillWave />} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Sales" value={summary?.totalSales || 0} icon={<FaShoppingCart />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Product Varieties" value={summary?.totalProducts || 0} icon={<FaBoxOpen />} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Units in Stock" value={summary?.totalStock || 0} icon={<FaWarehouse />} color="error" />
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2, height: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {summary?.topSellingProducts && summary.topSellingProducts.length > 0 ? (
                <Bar options={chartOptions} data={chartData} />
            ) : (
                <Typography align="center">No sales data available for the selected period.</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DashboardPage;