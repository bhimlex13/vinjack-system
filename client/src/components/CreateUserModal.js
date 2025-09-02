// client/src/components/CreateUserModal.js
import React, { useState } from 'react';
import { createUser } from '../api/userApi';
import '../styles/Form.css';

const CreateUserModal = ({ onClose, onUserCreated }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'Clerk', // Default role
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await createUser(formData);
      // Pass the credentials up to the parent component to display
      onUserCreated({
        username: response.data.generatedUsername,
        password: response.data.temporaryPassword,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-container">
      {error && <p className="error-message">{error}</p>}
      <div className="form-group">
        <label htmlFor="fullName">Full Name</label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="email">Email Address</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="role">Role</label>
        <select
          id="role"
          name="role"
          value={formData.role}
          onChange={handleChange}
          required
        >
          <option value="Clerk">Clerk</option>
          <option value="Mechanic">Mechanic</option>
          {/* Owner role should not be assignable here */}
        </select>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create User'}
        </button>
      </div>
    </form>
  );
};

export default CreateUserModal;