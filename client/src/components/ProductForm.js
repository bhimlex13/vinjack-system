// client/src/components/ProductForm.js
import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import ConfirmationContext from '../context/ConfirmationContext';
import AuthContext from '../context/AuthContext';

// MUI Imports
import {
  Box, Button, TextField, FormControl, InputLabel, Select, MenuItem,
  Grid, ToggleButtonGroup, ToggleButton, Alert, Stack
} from '@mui/material';

const ProductForm = ({ onFormSubmit, productToEdit, onClose, onProductDelete }) => {
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
    const initialData = productToEdit ? {
      itemCode: productToEdit.itemCode,
      name: productToEdit.name,
      category: productToEdit.category?._id || '',
      brand: productToEdit.brand?._id || '',
      cost: productToEdit.cost,
      price: productToEdit.price,
      quantity: productToEdit.quantity,
      reorderLevel: productToEdit.reorderLevel,
      image: productToEdit.image || '',
    } : {
      itemCode: '', name: '', category: '', brand: '',
      cost: '', price: '', quantity: '', reorderLevel: 5, image: ''
    };
    setFormData(initialData);
  }, [productToEdit]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, brandRes] = await Promise.all([api.get('/categories'), api.get('/brands')]);
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

  const resizeImage = (file, maxWidth, maxHeight) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          if (width > height) {
            if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
          } else {
            if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
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
        const resizedImage = await resizeImage(file, 800, 800);
        setFormData({ ...formData, image: resizedImage });
      } catch (error) {
        setError("Failed to process image. Please try another file.");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isConfirmed = await confirm(productToEdit ? 'Save these changes?' : 'Add this new product?');
    if (isConfirmed) {
      setError('');
      try {
        const res = productToEdit
          ? await api.put(`/products/${productToEdit._id}`, formData)
          : await api.post('/products', formData);
        onFormSubmit(res.data);
        onClose();
      } catch (err) {
        setError(err.response?.data?.message || 'An error occurred.');
      }
    }
  };

  const handleDelete = async () => {
    const isConfirmed = await confirm('Permanently delete this product? This action cannot be undone.');
    if (isConfirmed) {
        onProductDelete(productToEdit._id);
        onClose();
    }
  };

  return (
    <Box sx={{ minWidth: 500, p: 3, pt: 1 }}>
        <Box component="form" onSubmit={handleSubmit}>
          {/* --- THIS IS THE FIX: Changed grid format to match DashboardPage.js --- */}
          <Grid container spacing={2}>
            <Grid item size={{ xs: 12 }}><TextField fullWidth required name="itemCode" label="Item Code" value={formData.itemCode} onChange={handleChange} /></Grid>
            <Grid item size={{ xs: 12 }}><TextField fullWidth required name="name" label="Product Name" value={formData.name} onChange={handleChange} /></Grid>
            
            <Grid item size={{ xs: 6 }}>
              <FormControl fullWidth required><InputLabel>Category</InputLabel>
                <Select name="category" label="Category" value={formData.category} onChange={handleChange}>
                  {categories.map(c => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item size={{ xs: 6 }}>
              <FormControl fullWidth required><InputLabel>Brand</InputLabel>
                <Select name="brand" label="Brand" value={formData.brand} onChange={handleChange}>
                  {brands.map(b => <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item size={{ xs: 6 }}><TextField fullWidth required type="number" name="cost" label="Cost" value={formData.cost} onChange={handleChange} inputProps={{ step: "0.01" }} /></Grid>
            <Grid item size={{ xs: 6 }}><TextField fullWidth required type="number" name="price" label="Price" value={formData.price} onChange={handleChange} inputProps={{ step: "0.01" }} /></Grid>
            <Grid item size={{ xs: 6 }}><TextField fullWidth required type="number" name="quantity" label="Quantity" value={formData.quantity} onChange={handleChange} /></Grid>
            <Grid item size={{ xs: 6 }}><TextField fullWidth required type="number" name="reorderLevel" label="Reorder Level" value={formData.reorderLevel} onChange={handleChange} /></Grid>
            <Grid item size={{ xs: 12 }}>
              <FormControl fullWidth>
                <ToggleButtonGroup value={imageSource} exclusive onChange={(e, val) => val && setImageSource(val)} size="small">
                  <ToggleButton value="url">URL</ToggleButton>
                  <ToggleButton value="upload">Upload</ToggleButton>
                </ToggleButtonGroup>
                {imageSource === 'url' ? (
                  <TextField name="image" label="Image URL" value={formData.image} onChange={handleChange} sx={{ mt: 1 }} />
                ) : (
                  <Button variant="outlined" component="label" sx={{ mt: 1 }}> Upload File
                    <input type="file" hidden onChange={handleImageUpload} accept="image/*" />
                  </Button>
                )}
              </FormControl>
            </Grid>
          </Grid>
          
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          
          <Stack direction="row" justifyContent={productToEdit && user.role === 'Owner' ? "space-between" : "flex-end"} alignItems="center" sx={{ mt: 3 }}>
            {productToEdit && user.role === 'Owner' && <Button color="error" onClick={handleDelete}>Delete Product</Button>}
            <Stack direction="row" spacing={2}>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="contained">{productToEdit ? 'Save Changes' : 'Add Product'}</Button>
            </Stack>
          </Stack>
        </Box>
    </Box>
  );
};

export default ProductForm;