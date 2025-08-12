// client/src/pages/RegistrationPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import '../styles/RegistrationPage.css';

const RegistrationPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await api.post('/users/register', {
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      
      setSuccessMessage(response.data.message);

      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="registration-container">
      <div className="registration-form-area">
        <form className="registration-form" onSubmit={handleSubmit}>
          <h2>Create an Account</h2>
          
          {/* If registration is successful, show the success message */}
          {successMessage ? (
            <div className="success-message-box">
              <p>{successMessage}</p>
              <Link to="/login" className="back-to-login">Back to Login</Link>
            </div>
          ) : (
            <>
              <div className="input-group">
                <label htmlFor="fullName">Full Name</label>
                <input id="fullName" name="fullName" type="text" onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label htmlFor="username">Username</label>
                <input id="username" name="username" type="text" onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label htmlFor="email">Email Address</label>
                <input id="email" name="email" type="email" onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label htmlFor="password">Password</label>
                <input id="password" name="password" type="password" onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input id="confirmPassword" name="confirmPassword" type="password" onChange={handleChange} required />
              </div>
              
              <button type="submit" className="register-button" disabled={isLoading}>
                {isLoading ? 'Registering...' : 'Register'}
              </button>
              
              {error && <p className="error-message">{error}</p>}
            </>
          )}

          <p className="login-link">
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegistrationPage;