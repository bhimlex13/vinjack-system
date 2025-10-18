// client/src/pages/InventoryPage.js
import React, { useState, useEffect, useMemo, useContext } from 'react';
import api from '../api/axios';
import ProductForm from '../components/ProductForm';
import AuthContext from '../context/AuthContext';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import MovementHistoryModal from '../components/MovementHistoryModal';
import StockGauge from '../components/StockGauge';
import { toast } from 'react-toastify'; // <-- This can stay

// MUI Imports
import {
  Box, Button, Typography, TextField, Select, MenuItem, FormControl, InputLabel,
  Avatar, Paper, InputAdornment, Dialog, DialogTitle, DialogContent,
  Container, Tooltip, IconButton, Stack // <-- Stack stays
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import TuneIcon from '@mui/icons-material/Tune';
import HistoryIcon from '@mui/icons-material/History';
// <-- SyncIcon import removed

const InventoryPage = () => {
  const { user } = useContext(AuthContext);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [adjustmentProduct, setAdjustmentProduct] = useState(null);
  const [historyProduct, setHistoryProduct] = useState(null);
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

  const handleProductFormSubmit = (productData) => {
    const existingProductIndex = products.findIndex(p => p._id === productData._id);
    if (existingProductIndex > -1) {
      setProducts(prevProducts => {
        const newProducts = [...prevProducts];
        newProducts[existingProductIndex] = productData;
        return newProducts;
      });
    } else {
      setProducts(prevProducts => [productData, ...prevProducts]);
    }
  };

  const handleAdjustmentSuccess = () => {
    setAdjustmentProduct(null);
    fetchInitialData();
  };

  // <-- handleSyncStatuses function removed ---

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

  const getRowClassName = (params) => {
    return params.row.stockStatus === 'Out of Stock' ? 'out-of-stock-row' : '';
  };

  const columns = [
    { field: 'image', headerName: 'Image', width: 80, renderCell: (params) => <Avatar variant="rounded" src={params.row?.image || 'https://placehold.co/60x40'} />, sortable: false },
    { field: 'itemCode', headerName: 'Item Code', width: 130 },
    { field: 'name', headerName: 'Product Name', width: 250 },
    { field: 'category', headerName: 'Category', width: 150, renderCell: (params) => params.row.category?.name || 'N/A' },
    { field: 'brand', headerName: 'Brand', width: 150, renderCell: (params) => params.row.brand?.name || 'N/A' },
    { field: 'price', headerName: 'Price', width: 120, renderCell: (params) => `₱${(params.row?.price || 0).toFixed(2)}` },
    { 
      field: 'status', 
      headerName: 'Stock Level', 
      width: 200, 
      renderCell: (params) => (
        <StockGauge 
          quantity={params.row.quantity}
          maxStock={params.row.maxStock}
          stockStatus={params.row.stockStatus}
        />
      ) 
    },
    {
      field: 'actions', headerName: 'Actions', width: 180, sortable: false, align: 'center', headerAlign: 'center',
      renderCell: (params) => (
        (user?.role === 'Owner' || user?.role === 'Admin') && (
          <Box>
            <Tooltip title="View History">
              <IconButton size="small" color="info" onClick={() => setHistoryProduct(params.row)}>
                <HistoryIcon />
              </IconButton>
            </Tooltip>
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
      <Dialog open={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} maxWidth="md" fullWidth>
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
      
      {adjustmentProduct && (
        <StockAdjustmentModal
          product={adjustmentProduct}
          onClose={() => setAdjustmentProduct(null)}
          onSuccess={handleAdjustmentSuccess}
        />
      )}

      {historyProduct && (
        <MovementHistoryModal
          product={historyProduct}
          onClose={() => setHistoryProduct(null)}
        />
      )}

      {/* --- MODIFIED HEADER --- */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Inventory Management
        </Typography>
        
        <Stack direction="row" spacing={2}>
          {/* <-- Sync Button Removed --> */}
          {user && (user.role === 'Owner' || user.role === 'Clerk') && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openProductModalForAdd}>
              Add New Product
            </Button>
          )}
        </Stack>
      </Box>
      {/* --- END MODIFICATION --- */}


      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField label="Search" variant="outlined" size="small" value={searchTerm} onChange={(e) => setSearchTerm(e.g.value)}
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
      
      <Paper sx={{
          height: '70vh',
          width: '100%',
          '& .out-of-stock-row': {
            backgroundColor: '#fafafa',
            color: '#9e9e9e',
          },
          '& .out-of-stock-row:hover': {
            backgroundColor: '#f0f0f0',
          },
      }}>
        <DataGrid
          rows={filteredProducts}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row._id}
          initialState={{ sorting: { sortModel: [{ field: 'status', sort: 'desc' }] }, }}
          getRowClassName={getRowClassName}
        />
      </Paper>
    </Container>
  );
};

export default InventoryPage;