// client/src/pages/InventoryPage.js
import React, { useState, useEffect, useMemo, useContext } from 'react';
import api from '../api/axios';
import ProductForm from '../components/ProductForm';
import AuthContext from '../context/AuthContext';

// MUI Imports
import {
  Box, Button, Typography, TextField, Select, MenuItem, FormControl,
  InputLabel, Chip, Avatar, Paper, InputAdornment, Dialog, DialogTitle, DialogContent
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';

const InventoryPage = () => {
  const { user } = useContext(AuthContext);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const [productsResponse, categoriesResponse, brandsResponse] = await Promise.all([
        api.get('/products'),
        api.get('/categories'),
        api.get('/brands')
      ]);

      setProducts(productsResponse.data);
      setCategories(categoriesResponse.data);
      setBrands(brandsResponse.data);
    } catch (err) {
      setError('Failed to fetch data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      if (!product || !product.name || !product.itemCode) {
        return false;
      }

      const searchMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.itemCode.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = filterCategory ? product.category?._id === filterCategory : true;
      const brandMatch = filterBrand ? product.brand?._id === filterBrand : true;
      return searchMatch && categoryMatch && brandMatch;
    });
  }, [products, searchTerm, filterCategory, filterBrand]);

  const handleFormSubmit = () => fetchInitialData();

  const openModalForEdit = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const openModalForAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (productId) => {
    try {
      await api.delete(`/products/${productId}`);
      setProducts(products.filter(p => p._id !== productId));
    } catch (err) {
      setError('Failed to delete product.');
    }
  };

  const getStatusChip = (params) => {
    const { quantity, reorderLevel } = params.row;
    if (quantity === 0) {
      return <Chip label="Out of Stock" color="error" size="small" />;
    }
    if (reorderLevel && quantity <= reorderLevel) {
      return <Chip label="Low Stock" color="warning" size="small" />;
    }
    return <Chip label="In Stock" color="success" size="small" />;
  };

  const columns = [
    {
      field: 'image', headerName: 'Image', width: 80,
      renderCell: (params) => <Avatar variant="rounded" src={params.value || 'https://placehold.co/60x40'} />,
      sortable: false,
    },
    { field: 'itemCode', headerName: 'Item Code', width: 130 },
    { field: 'name', headerName: 'Product Name', width: 250 },
    {
      field: 'category',
      headerName: 'Category',
      width: 150,
      renderCell: (params) => params.row.category ? params.row.category.name : 'N/A'
    },
    {
      field: 'brand',
      headerName: 'Brand',
      width: 150,
      renderCell: (params) => params.row.brand ? params.row.brand.name : 'N/A'
    },
    {
      field: 'price', headerName: 'Price', width: 120,
      valueFormatter: (params) => typeof params.value === 'number' ? `₱${params.value.toFixed(2)}` : 'N/A'
    },
    { field: 'quantity', headerName: 'Quantity', width: 120 },
    { field: 'reorderLevel', headerName: 'Reorder Lvl', width: 120, valueGetter: (params) => params.value || 0 },
    {
      field: 'status', headerName: 'Status', width: 150, renderCell: getStatusChip,
    },
    {
      field: 'actions', headerName: 'Actions', width: 120, sortable: false,
      renderCell: (params) => (
        user && (user.role === 'Owner' || user.role === 'Clerk') && (
          <Button variant="outlined" size="small" onClick={() => openModalForEdit(params.row)}>
            Edit
          </Button>
        )
      )
    }
  ];

  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <>
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md">
        <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        <DialogContent>
          <ProductForm
            onFormSubmit={handleFormSubmit}
            productToEdit={editingProduct}
            onClose={() => setIsModalOpen(false)}
            onProductDelete={handleDelete}
          />
        </DialogContent>
      </Dialog>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Inventory Management
        </Typography>
        {user && (user.role === 'Owner' || user.role === 'Clerk') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openModalForAdd}>
            Add New Product
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          label="Search" variant="outlined" size="small" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1 }}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>), }}
        />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Category</InputLabel>
          <Select value={filterCategory} label="Category" onChange={(e) => setFilterCategory(e.target.value)}>
            <MenuItem value=""><em>All Categories</em></MenuItem>
            {categories.map(cat => <MenuItem key={cat._id} value={cat._id}>{cat.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Brand</InputLabel>
          <Select value={filterBrand} label="Brand" onChange={(e) => setFilterBrand(e.target.value)}>
            <MenuItem value=""><em>All Brands</em></MenuItem>
            {brands.map(brand => <MenuItem key={brand._id} value={brand._id}>{brand.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Paper>

      <Paper sx={{ height: '70vh', width: '100%' }}>
        <DataGrid
          rows={filteredProducts}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row._id}
          initialState={{
            sorting: { sortModel: [{ field: 'status', sort: 'desc' }] },
          }}
        />
      </Paper>
    </>
  );
};

export default InventoryPage;