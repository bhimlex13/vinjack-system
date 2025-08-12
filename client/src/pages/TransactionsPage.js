// client/src/pages/TransactionsPage.js
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import ReceiptModal from '../components/ReceiptModal';
import '../styles/TransactionsPage.css'; // We will create this next

const TransactionsPage = () => {
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const response = await api.get('/sales');
        setSales(response.data);
      } catch (err) {
        setError('Failed to fetch transaction data.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSales();
  }, []);

  if (isLoading) return <div className="loading">Loading transactions...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="transactions-container">
      <h1>Transaction Log</h1>
      <p>A log of all completed sales. Click "View Receipt" to see details.</p>

      <table className="transactions-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Sale ID</th>
            <th>Cashier</th>
            <th>Total Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale._id}>
              <td>{new Date(sale.createdAt).toLocaleString()}</td>
              <td>{sale._id}</td>
              <td>{sale.recordedBy?.fullName || 'N/A'}</td>
              <td>₱{sale.totalAmount.toFixed(2)}</td>
              <td className="actions">
                <button 
                  className="btn-view"
                  onClick={() => setSelectedSale(sale)}
                >
                  View Receipt
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedSale && (
        <ReceiptModal
          saleData={selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </div>
  );
};

export default TransactionsPage;