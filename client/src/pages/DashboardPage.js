// client/src/pages/DashboardPage.js
import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import '../styles/DashboardPage.css';
import { Bar } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DashboardPage = () => {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // NEW: State to manage the selected time range filter
  const [timeRange, setTimeRange] = useState('all');

  // MODIFIED: useEffect now depends on timeRange to refetch data
  useEffect(() => {
    const fetchSummary = async () => {
      setIsLoading(true);
      try {
        // Pass the selected timeRange as a query parameter to the API
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
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: `Top 5 Selling Products (${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)})` },
    },
    scales: { y: { beginAtZero: true } }
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="loading">Loading dashboard...</div>;
    }
    return (
      <>
        <div className="stats-cards">
          <div className="stat-card">
            <h3>Total Revenue</h3>
            <p>₱{summary?.totalRevenue.toFixed(2) || '0.00'}</p>
          </div>
          <div className="stat-card">
            <h3>Total Sales</h3>
            <p>{summary?.totalSales || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Product Varieties</h3>
            <p>{summary?.totalProducts || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Total Units in Stock</h3>
            <p>{summary?.totalStock || 0}</p>
          </div>
        </div>
        <div className="chart-container">
          {summary?.topSellingProducts && summary.topSellingProducts.length > 0 ? (
              <Bar options={chartOptions} data={chartData} />
          ) : (
              <p>No sales data available for the selected period.</p>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        {/* NEW: Filter buttons */}
        <div className="dashboard-filters">
          <button className={`filter-btn ${timeRange === 'all' ? 'active' : ''}`} onClick={() => setTimeRange('all')}>All Time</button>
          <button className={`filter-btn ${timeRange === 'month' ? 'active' : ''}`} onClick={() => setTimeRange('month')}>This Month</button>
          <button className={`filter-btn ${timeRange === 'week' ? 'active' : ''}`} onClick={() => setTimeRange('week')}>This Week</button>
          <button className={`filter-btn ${timeRange === 'today' ? 'active' : ''}`} onClick={() => setTimeRange('today')}>Today</button>
        </div>
      </div>
      {renderContent()}
    </div>
  );
};

export default DashboardPage;