// client/src/pages/AlertsPage.js
import React, { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import '../styles/AlertsPage.css';

const AlertsPage = () => {
  const { lowStockItems = [] } = useContext(AuthContext);

  return (
    <div className="alerts-container">
      <h1>Low Stock Alerts</h1>
      
      {lowStockItems.length > 0 ? (
        <>
          <p>The following items are at or below their designated reorder level.</p>
          <table className="alerts-table">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Product Name</th>
                <th>Current Quantity</th>
                <th>Reorder Level</th>
              </tr>
            </thead>
            <tbody>
              {lowStockItems.map((item) => (
                <tr key={item._id} className="alert-item">
                  <td>{item.itemCode}</td>
                  <td>{item.name}</td>
                  <td className="quantity-low">{item.quantity}</td>
                  <td>{item.reorderLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div className="no-alerts">
          <p>✅ All inventory levels are healthy. There are no low stock alerts.</p>
        </div>
      )}
    </div>
  );
};

export default AlertsPage;