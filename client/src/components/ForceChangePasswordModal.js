// client/src/components/ForceChangePasswordModal.js
import React, { useState, useContext } from 'react';
import { forceChangePassword } from '../api/userApi';
import AuthContext from '../context/AuthContext';
import '../styles/Form.css';
import '../styles/Modal.css';

const ForceChangePasswordModal = () => {
  const { passwordChangeCompleted } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await forceChangePassword(formData);
      setMessage(response.data.message);
      // Wait a moment before closing the modal and unlocking the app
      setTimeout(() => {
        passwordChangeCompleted(); // Notify context that the change is done
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop-fullscreen">
      <div className="modal-content-fullscreen">
        <h2>Change Your Password</h2>
        <p>As this is your first time logging in, you must change your temporary password.</p>
        <form onSubmit={handleSubmit} className="form-container">
          {error && <p className="error-message">{error}</p>}
          {message && <p className="success-message">{message}</p>}
          
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={isLoading || message}>
              {isLoading ? 'Updating...' : 'Set New Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForceChangePasswordModal;