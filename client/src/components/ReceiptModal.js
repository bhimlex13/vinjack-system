// client/src/components/ReceiptModal.js
import React from 'react';
import '../styles/ReceiptModal.css'; // We will create this CSS file next

const ReceiptModal = ({ saleData, onClose }) => {

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content receipt-modal">
        <div className="receipt-content" id="receipt-to-print">
          <header className="receipt-header">
            <h2>VinJack System</h2>
            <p>Official Receipt</p>
          </header>
          <div className="receipt-details">
            <p><strong>Sale ID:</strong> {saleData._id}</p>
            <p><strong>Date:</strong> {new Date(saleData.createdAt).toLocaleString()}</p>
            <p><strong>Cashier:</strong> {saleData.recordedBy?.fullName || 'N/A'}</p>
          </div>
          <table className="receipt-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {saleData.items.map((item) => (
                <tr key={item._id}>
                  <td>{item.product?.name || 'Product not found'}</td>
                  <td>{item.quantity}</td>
                  <td>₱{item.priceAtTime.toFixed(2)}</td>
                  <td>₱{(item.quantity * item.priceAtTime).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <footer className="receipt-footer">
            <div className="receipt-total">
              <strong>Total:</strong>
              <strong>₱{saleData.totalAmount.toFixed(2)}</strong>
            </div>
            <p className="thank-you-msg">Thank you for your purchase!</p>
          </footer>
        </div>
        <div className="receipt-actions">
          <button className="receipt-btn close-btn" onClick={onClose}>Close</button>
          <button className="receipt-btn print-btn" onClick={handlePrint}>Print Receipt</button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;