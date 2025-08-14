// client/src/components/WarningModal.js
import React from 'react';
import { useWarning } from '../context/WarningContext';
import '../styles/WarningModal.css';

const WarningModal = () => {
  // No changes needed here, but the 'warning' variable now points to the first item in the queue
  const { warning, hideWarning } = useWarning();

  if (!warning) {
    return null;
  }

  const isOutOfStock = warning.type === 'OUT_OF_STOCK';

  return (
    <div className="warning-modal-overlay">
      <div className="warning-modal-content">
        <div className={`warning-modal-header ${isOutOfStock ? 'out-of-stock' : 'low-stock'}`}>
          <span className="warning-icon">{isOutOfStock ? '🛑' : '⚠️'}</span>
          <h3>Stock Level Warning</h3>
        </div>
        <div className="warning-modal-body">
          <img
            src={warning.image || 'https://placehold.co/100x100/e2e8f0/e2e8f0?text=No+Image'}
            alt={warning.productName}
            className="warning-product-image"
          />
          <p>{warning.message}</p>
        </div>
        <div className="warning-modal-footer">
          <button onClick={hideWarning} className="ok-btn">
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default WarningModal;