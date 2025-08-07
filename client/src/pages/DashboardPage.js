// client/src/pages/DashboardPage.js
import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import '../styles/DashboardPage.css';
import { Bar } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

// This is important! It registers the necessary components for Chart.js to work.
Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DashboardPage = () => {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await api.get('/reports/summary');
        setSummary(response.data);
      } catch (error) {
        console.error("Failed to fetch dashboard summary", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSummary();
  }, []);

  // Prepare data for the bar chart
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
      title: { display: true, text: 'Top 5 Selling Products' },
    },
    scales: {
        y: {
            beginAtZero: true
        }
    }
  };

  if (isLoading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <h1>Dashboard</h1>
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
            <p>No sales data available to display chart.</p>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;