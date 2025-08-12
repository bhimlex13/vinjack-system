// client/src/components/ProductMovementHistory.js
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import '../styles/ProductMovementHistory.css'; // We will create this next

const ProductMovementHistory = ({ productId }) => {
  const [movements, setMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (productId) {
      const fetchHistory = async () => {
        try {
          setIsLoading(true);
          const response = await api.get(`/movements/${productId}`);
          setMovements(response.data);
        } catch (error) {
          console.error("Failed to fetch movement history", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchHistory();
    }
  }, [productId]);

  if (isLoading) return <p>Loading history...</p>;
  if (movements.length === 0) return <p>No movement history found for this product.</p>;

  return (
    <div className="movement-history-container">
      <table className="movement-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Change</th>
            <th>Stock After</th>
            <th>User</th>
            <th>Reference/Notes</th>
          </tr>
        </thead>
        <tbody>
          {movements.map(move => (
            <tr key={move._id}>
              <td>{new Date(move.createdAt).toLocaleString()}</td>
              <td><span className={`move-type-badge move-type-${move.type.toLowerCase()}`}>{move.type}</span></td>
              <td className={move.quantityChange > 0 ? 'qty-in' : 'qty-out'}>
                {move.quantityChange > 0 ? `+${move.quantityChange}` : move.quantityChange}
              </td>
              <td>{move.stockAfter}</td>
              <td>{move.recordedBy?.fullName || 'N/A'}</td>
              <td>{move.referenceId || move.notes || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductMovementHistory;