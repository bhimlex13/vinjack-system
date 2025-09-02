// client/src/components/CredentialsDisplayModal.js
import React from 'react';
import Modal from './Modal';
import '../styles/Modal.css';

const CredentialsDisplayModal = ({ credentials, onClose }) => {
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Employee Credentials">
      <div className="credentials-display">
        <p className="warning-text">
          Please copy these credentials and send them to the new employee.
          <strong> This is the only time they will be shown.</strong>
        </p>
        <div className="credential-item">
          <span>Username:</span>
          <strong>{credentials.username}</strong>
          <button onClick={() => handleCopy(credentials.username)}>Copy</button>
        </div>
        <div className="credential-item">
          <span>Temporary Password:</span>
          <strong>{credentials.password}</strong>
          <button onClick={() => handleCopy(credentials.password)}>Copy</button>
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CredentialsDisplayModal;