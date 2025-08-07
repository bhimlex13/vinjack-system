// client/src/components/SupplierForm.js
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import '../styles/Form.css';

const SupplierForm = ({ onFormSubmit, supplierToEdit, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    contactNumber: '',
    address: ''
  });
  const [error, setError] = useState('');

  // Pre-fill the form if we are editing an existing supplier
  useEffect(() => {
    if (supplierToEdit) {
      setFormData(supplierToEdit);
    } else {
      // Reset form if we are adding a new one
      setFormData({ name: '', contactPerson: '', contactNumber: '', address: '' });
    }
  }, [supplierToEdit]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      let res;
      if (supplierToEdit) {
        // Send a PUT request to update
        res = await api.put(`/suppliers/${supplierToEdit._id}`, formData);
      } else {
        // Send a POST request to create
        res = await api.post('/suppliers', formData);
      }
      onFormSubmit(res.data); // Pass the updated/new data back to the parent
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred.');
    }
  };

  return (
    <form className="data-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Supplier Name</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} required />
      </div>
      <div className="form-group">
        <label>Contact Person</label>
        <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label>Contact Number</label>
        <input type="text" name="contactNumber" value={formData.contactNumber} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label>Address</label>
        <input type="text" name="address" value={formData.address} onChange={handleChange} />
      </div>

      {error && <p className="form-error-message">{error}</p>}
      <button type="submit" className="form-submit-btn">
        {supplierToEdit ? 'Update Supplier' : 'Add Supplier'}
      </button>
    </form>
  );
};

export default SupplierForm;