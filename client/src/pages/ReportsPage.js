// client/src/pages/ReportsPage.js
import React, { useState, useMemo } from 'react';
import api from '../api/axios';
import '../styles/ReportsPage.css';

const ReportsPage = () => {
  const [reportData, setReportData] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // NEW: Calculate summary totals using useMemo for efficiency
  const reportSummary = useMemo(() => {
    if (reportData.length === 0) {
      return { totalRevenue: 0, totalCost: 0, totalProfit: 0 };
    }

    const totalRevenue = reportData.reduce((sum, sale) => sum + sale.totalAmount, 0);

    const totalCost = reportData.reduce((sum, sale) => {
      const saleCost = sale.items.reduce((itemSum, item) => {
        // Use costAtTime if available, otherwise assume 0
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
    setReportData([]); // Clear previous results
    try {
      const response = await api.get(`/reports/sales?startDate=${startDate}&endDate=${endDate}`);
      // MODIFIED: Also fetch costAtTime by populating it in the backend report query
      setReportData(response.data);
    } catch (err) {
      setError('Failed to generate report.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="reports-container">
      <h1>Sales & Profitability Report</h1>
      <div className="report-controls">
        <div className="date-picker">
          <label htmlFor="start-date">Start Date:</label>
          <input type="date" id="start-date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="date-picker">
          <label htmlFor="end-date">End Date:</label>
          <input type="date" id="end-date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button onClick={handleGenerateReport} disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* NEW: Report Summary Cards */}
      {!isLoading && reportData.length > 0 && (
        <div className="report-summary-cards">
          <div className="summary-card">
            <h3>Total Revenue</h3>
            <p>₱{reportSummary.totalRevenue.toFixed(2)}</p>
          </div>
          <div className="summary-card">
            <h3>Cost of Goods Sold</h3>
            <p>₱{reportSummary.totalCost.toFixed(2)}</p>
          </div>
          <div className="summary-card profit">
            <h3>Gross Profit</h3>
            <p>₱{reportSummary.totalProfit.toFixed(2)}</p>
          </div>
        </div>
      )}

      <div className="report-results">
        {reportData.length > 0 ? (
          <table className="report-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Items Sold</th>
                <th>Recorded By</th>
                <th>Total Revenue</th>
                {/* NEW: Added Profit Column */}
                <th>Total Profit</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((sale) => {
                // Calculate profit for each individual sale
                const saleCost = sale.items.reduce((sum, item) => sum + (item.costAtTime || 0) * item.quantity, 0);
                const saleProfit = sale.totalAmount - saleCost;
                
                return (
                  <tr key={sale._id}>
                    <td>{new Date(sale.createdAt).toLocaleString()}</td>
                    <td>
                      <ul>
                        {sale.items.map(item => (
                          <li key={item._id}>
                            {item.quantity}x {item.product?.name || 'N/A'}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>{sale.recordedBy?.fullName || 'N/A'}</td>
                    <td>₱{sale.totalAmount.toFixed(2)}</td>
                    {/* NEW: Display profit per sale */}
                    <td className="profit-cell">₱{saleProfit.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          !isLoading && <p>No sales data for the selected period.</p>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;