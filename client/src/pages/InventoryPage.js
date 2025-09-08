// client/src/pages/InventoryPage.js
import React, { useState, useEffect, useMemo, useContext } from 'react';
import api from '../api/axios';
import ProductForm from '../components/ProductForm';
import AuthContext from '../context/AuthContext';
import StockAdjustmentModal from '../components/StockAdjustmentModal'; // <-- NEW: Import the modal

// MUI Imports
import {
  Box, Button, Typography, TextField, Select, MenuItem, FormControl, InputLabel, 
  Chip, Avatar, Paper, InputAdornment, Dialog, DialogTitle, DialogContent, 
  Container, Tooltip, IconButton
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import TuneIcon from '@mui/icons-material/Tune'; // Icon for Adjust Stock

const InventoryPage = () => {
  const { user } = useContext(AuthContext);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // --- NEW: State for the adjustment modal ---
  const [adjustmentProduct, setAdjustmentProduct] = useState(null);

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
      if (!product || !product.name || !product.itemCode) return false;
      const searchMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.itemCode.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryId = typeof product.category === 'object' ? product.category?._id : product.category;
      const brandId = typeof product.brand === 'object' ? product.brand?._id : product.brand;
      const categoryMatch = filterCategory ? categoryId === filterCategory : true;
      const brandMatch = filterBrand ? brandId === filterBrand : true;
      return searchMatch && categoryMatch && brandMatch;
    });
  }, [products, searchTerm, filterCategory, filterBrand]);

  const handleProductFormSubmit = () => fetchInitialData();

  // --- NEW: Handler for when an adjustment is successfully submitted ---
  const handleAdjustmentSuccess = () => {
    setAdjustmentProduct(null); // Close the modal
    fetchInitialData(); // Refresh the inventory list
  };

  const openProductModalForEdit = (product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const openProductModalForAdd = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
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
    if (!params.row) return null; 
    const { quantity, reorderLevel } = params.row;
    if (quantity === 0) return <Chip label="Out of Stock" color="error" size="small" />;
    if (reorderLevel && quantity <= reorderLevel) return <Chip label="Low Stock" color="warning" size="small" />;
    return <Chip label="In Stock" color="success" size="small" />;
  };

  const columns = [
    { field: 'image', headerName: 'Image', width: 80, renderCell: (params) => <Avatar variant="rounded" src={params.row?.image || 'https://placehold.co/60x40'} />, sortable: false },
    { field: 'itemCode', headerName: 'Item Code', width: 130 },
    { field: 'name', headerName: 'Product Name', width: 250 },
    { field: 'category', headerName: 'Category', width: 150, renderCell: (params) => { const catId = params.row.category?._id || params.row.category; const cat = categories.find(c => c._id === catId); return cat ? cat.name : 'N/A'; } },
    { field: 'brand', headerName: 'Brand', width: 150, renderCell: (params) => { const brandId = params.row.brand?._id || params.row.brand; const brand = brands.find(b => b._id === brandId); return brand ? brand.name : 'N/A'; } },
    { field: 'price', headerName: 'Price', width: 120, renderCell: (params) => `₱${(params.row?.price || 0).toFixed(2)}` },
    { field: 'quantity', headerName: 'Quantity', width: 120 },
    { field: 'status', headerName: 'Status', width: 150, renderCell: getStatusChip },
    {
      field: 'actions', headerName: 'Actions', width: 150, sortable: false, align: 'center', headerAlign: 'center',
      renderCell: (params) => (
        user?.role === 'Owner' && (
          <Box>
            <Tooltip title="Edit Product">
              <IconButton size="small" onClick={() => openProductModalForEdit(params.row)}>
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Adjust Stock">
              <IconButton size="small" color="secondary" onClick={() => setAdjustmentProduct(params.row)}>
                <TuneIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )
      )
    }
  ];

  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Dialog open={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} maxWidth="md">
        <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        <DialogContent>
          <ProductForm
            onFormSubmit={handleProductFormSubmit}
            productToEdit={editingProduct}
            onClose={() => setIsProductModalOpen(false)}
            onProductDelete={handleDelete}
          />
        </DialogContent>
      </Dialog>
      
      {/* --- NEW: Render the Stock Adjustment Modal when a product is selected --- */}
      {adjustmentProduct && (
        <StockAdjustmentModal
          product={adjustmentProduct}
          onClose={() => setAdjustmentProduct(null)}
          onSuccess={handleAdjustmentSuccess}
        />
      )}

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Inventory Management
        </Typography>
        {user && (user.role === 'Owner' || user.role === 'Clerk') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openProductModalForAdd}>
            Add New Product
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField label="Search" variant="outlined" size="small" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1 }} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>), }}
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
          initialState={{ sorting: { sortModel: [{ field: 'status', sort: 'desc' }] }, }}
        />
      </Paper>
    </Container>
  );
};

export default InventoryPage;