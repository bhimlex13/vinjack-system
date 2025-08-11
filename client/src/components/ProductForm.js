// client/src/components/ProductForm.js
import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import '../styles/Form.css';
import ConfirmationContext from '../context/ConfirmationContext';
import AuthContext from '../context/AuthContext';

const ProductForm = ({ onFormSubmit, productToEdit, onClose }) => {
  const { confirm } = useContext(ConfirmationContext);
  const { user } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    itemCode: '', name: '', category: '', brand: '',
    cost: '', price: '', quantity: '', reorderLevel: 5, image: ''
  });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [error, setError] = useState('');
  const [imageSource, setImageSource] = useState('url');

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
        reorderLevel: productToEdit.reorderLevel,
        image: productToEdit.image || '',
      });
    } else {
        setFormData({
            itemCode: '', name: '', category: '', brand: '',
            cost: '', price: '', quantity: '', reorderLevel: 5, image: ''
        });
    }
  }, [productToEdit]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const catRes = await api.get('/categories');
        const brandRes = await api.get('/brands');
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

  // --- FUNCTION TO RESIZE IMAGES ---
  const resizeImage = (file, maxWidth, maxHeight) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.9)); // Get Base64 string of the resized image
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        // Resize the image to a max of 800x800 pixels before setting it
        const resizedImage = await resizeImage(file, 800, 800);
        setFormData({ ...formData, image: resizedImage });
      } catch (error) {
        console.error("Failed to resize image", error);
        setError("Failed to process image. Please try another file.");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const confirmMessage = productToEdit ? 'Are you sure you want to save these changes?' : 'Are you sure you want to add this new product?';
    const isConfirmed = await confirm(confirmMessage);

    if (isConfirmed) {
      setError('');
      try {
        let res;
        if (productToEdit) {
          res = await api.put(`/products/${productToEdit._id}`, formData);
        } else {
          res = await api.post('/products', formData);
        }
        onFormSubmit(res.data);
        onClose();
      } catch (err) {
        const errorMessage = err.response?.data?.message || 'An error occurred. Please check the fields.';
        setError(errorMessage);
      }
    }
  };
  
  const onProductDelete = async (productId) => {
      try {
        await api.delete(`/products/${productId}`);
        onFormSubmit(); // This will trigger a refetch on the parent page
      } catch (err) {
        alert('Failed to delete product.');
      }
  }

  const handleDelete = async () => {
    const isConfirmed = await confirm('Are you sure you want to permanently delete this product?');
    if (isConfirmed) {
      onProductDelete(productToEdit._id);
      onClose();
    }
  };

  const handleCancel = async () => {
    const isConfirmed = await confirm('Are you sure you want to cancel? Any unsaved changes will be lost.');
    if (isConfirmed) {
      onClose();
    }
  };

  return (
    <form className="data-form" onSubmit={handleSubmit}>
      <div className="form-group-grid">
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
        <div className="form-group">
          <label>Reorder Level</label>
          <input type="number" name="reorderLevel" value={formData.reorderLevel} onChange={handleChange} required />
        </div>
      </div>
      
      <div className="form-group">
        <label>Image</label>
        <div className="image-source-toggle">
          <button type="button" className={imageSource === 'url' ? 'active' : ''} onClick={() => setImageSource('url')}>URL</button>
          <button type="button" className={imageSource === 'upload' ? 'active' : ''} onClick={() => setImageSource('upload')}>Upload</button>
        </div>
        {imageSource === 'url' ? (
          <input type="text" name="image" value={formData.image} onChange={handleChange} placeholder="https://example.com/image.jpg" />
        ) : (
          <input type="file" name="imageFile" onChange={handleImageUpload} accept="image/*" />
        )}
      </div>
      
      {error && <p className="form-error-message">{error}</p>}
      
      <div className="form-actions">
        {productToEdit && user.role === 'Owner' && (
          <button type="button" className="form-action-btn form-delete-btn" onClick={handleDelete}>
            Delete Product
          </button>
        )}
        <div className="form-actions-right">
          <button type="button" className="form-action-btn form-cancel-btn" onClick={handleCancel}>Cancel</button>
          <button type="submit" className="form-action-btn form-submit-btn">
            {productToEdit ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ProductForm;