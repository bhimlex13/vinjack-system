// client/src/pages/ReportsPage.js
import React, { useState } from 'react';
import api from '../api/axios';
import '../styles/ReportsPage.css';

const ReportsPage = () => {
  const [reportData, setReportData] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      setError('Please select both a start and end date.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      // Pass dates as URL query parameters
      const response = await api.get(`/reports/sales?startDate=${startDate}&endDate=${endDate}`);
      setReportData(response.data);
    } catch (err) {
      setError('Failed to generate report.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="reports-container">
      <h1>Sales Report</h1>
      <div className="report-controls">
        <div className="date-picker">
          <label htmlFor="start-date">Start Date:</label>
          <input
            type="date"
            id="start-date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="date-picker">
          <label htmlFor="end-date">End Date:</label>
          <input
            type="date"
            id="end-date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button onClick={handleGenerateReport} disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="report-results">
        {reportData.length > 0 ? (
          <table className="report-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Items Sold</th>
                <th>Recorded By</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((sale) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No sales data for the selected period.</p>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;