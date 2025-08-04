// client/src/components/ProductForm.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Form.css';

const ProductForm = ({ onFormSubmit, productToEdit, onClose }) => {
  const [formData, setFormData] = useState({
    itemCode: '', name: '', category: '', brand: '',
    cost: '', price: '', quantity: '',
  });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [error, setError] = useState('');

  // This effect populates the form if we are editing a product
  useEffect(() => {
    if (productToEdit) {
      setFormData({
        itemCode: productToEdit.itemCode,
        name: productToEdit.name,
        category: productToEdit.category._id,
        brand: productToEdit.brand._id,
        cost: productToEdit.cost,
        price: productToEdit.price,
        quantity: productToEdit.quantity,
      });
    } else {
        // Reset form when adding a new product
        setFormData({
            itemCode: '', name: '', category: '', brand: '',
            cost: '', price: '', quantity: '',
        });
    }
  }, [productToEdit]);

  // Fetches categories and brands for the dropdowns
  useEffect(() => {
    const fetchData = async () => {
      try {
        const catRes = await axios.get('http://localhost:5000/api/categories');
        const brandRes = await axios.get('http://localhost:5000/api/brands');
        setCategories(catRes.data);
        setBrands(brandRes.data);
      } catch (fetchError) {
        setError("Could not load form data.");
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      let res;
      if (productToEdit) {
        // If editing, send a PUT request
        res = await axios.put(`http://localhost:5000/api/products/${productToEdit._id}`, formData);
      } else {
        // If creating, send a POST request
        res = await axios.post('http://localhost:5000/api/products', formData);
      }
      onFormSubmit(res.data);
      onClose();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'An error occurred. Please check the fields.';
      setError(errorMessage);
    }
  };

  return (
    <form className="data-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Item Code</label>
        <input type="text" name="itemCode" value={formData.itemCode} onChange={handleChange} required />
      </div>
      <div className="form-group">
        <label>Product Name</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} required />
      </div>
      <div className="form-group">
        <label>Category</label>
        <select name="category" value={formData.category} onChange={handleChange} required>
          <option value="">Select Category</option>
          {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>Brand</label>
        <select name="brand" value={formData.brand} onChange={handleChange} required>
          <option value="">Select Brand</option>
          {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>Cost</label>
        <input type="number" step="0.01" name="cost" value={formData.cost} onChange={handleChange} required />
      </div>
      <div className="form-group">
        <label>Price</label>
        <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} required />
      </div>
      <div className="form-group">
        <label>Quantity</label>
        <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} required />
      </div>
      {error && <p className="form-error-message">{error}</p>}
      <button type="submit" className="form-submit-btn">
        {productToEdit ? 'Update Product' : 'Add Product'}
      </button>
    </form>
  );
};

export default ProductForm;