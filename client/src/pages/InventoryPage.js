// client/src/pages/InventoryPage.js
import React, { useState, useEffect, useMemo, useContext } from 'react';
import api from '../api/axios';
import ProductForm from '../components/ProductForm';
import AuthContext from '../context/AuthContext';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import MovementHistoryModal from '../components/MovementHistoryModal';
import StockGauge from '../components/StockGauge';
import { motion, AnimatePresence } from 'framer-motion';

// MUI Imports
import {
  Box, Button, Typography, TextField, Select, MenuItem, FormControl, InputLabel,
  Avatar, Paper, InputAdornment, Dialog, DialogTitle, DialogContent,
  Container, Tooltip, IconButton, Stack, Chip 
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import TuneIcon from '@mui/icons-material/Tune';
import HistoryIcon from '@mui/icons-material/History';
import InventoryIcon from '@mui/icons-material/Inventory';

import LoadingSpinner from '../components/LoadingSpinner';

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
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterStockLevel, setFilterStockLevel] = useState('');

  // --- FRAMER MOTION VARIANTS ---
  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };

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
      const statusMatch = filterStatus ? product.status === filterStatus : true;
      const stockLevelMatch = filterStockLevel ? product.stockStatus === filterStockLevel : true;

      return searchMatch && categoryMatch && brandMatch && statusMatch && stockLevelMatch;
    });
  }, [products, searchTerm, filterCategory, filterBrand, filterStatus, filterStockLevel]); 

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

  const openProductModalForEdit = (product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const openProductModalForAdd = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleArchive = async (productId) => {
    try {
      const response = await api.delete(`/products/${productId}`);
      handleProductFormSubmit(response.data.product); 
      return Promise.resolve(); 
    } catch (err) {
      setError('Failed to archive product.');
      return Promise.reject(err); 
    }
  };

  const getRowClassName = (params) => {
    if (params.row.status === 'inactive') {
      return 'inactive-row';
    }
    return params.row.stockStatus === 'Out of Stock' ? 'out-of-stock-row' : '';
  };

  const columns = [
    { 
        field: 'image', 
        headerName: 'Image', 
        width: 80, 
        renderCell: (params) => <Avatar variant="rounded" src={params.row?.image || 'https://placehold.co/60x40'} sx={{ width: 50, height: 50 }} />, 
        sortable: false,
        align: 'center',
        headerAlign: 'center'
    },
    { field: 'itemCode', headerName: 'Item Code', width: 130 },
    { field: 'name', headerName: 'Product Name', width: 250 },
    { field: 'category', headerName: 'Category', width: 150, renderCell: (params) => params.row.category?.name || 'N/A' },
    { field: 'brand', headerName: 'Brand', width: 150, renderCell: (params) => params.row.brand?.name || 'N/A' },
    { field: 'price', headerName: 'Price', width: 120, renderCell: (params) => `₱${(params.row?.price || 0).toFixed(2)}` },
    { 
      field: 'stockStatus', 
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
      field: 'status',
      headerName: 'Status',
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Chip
          label={params.value === 'active' ? 'Active' : 'Archived'}
          color={params.value === 'active' ? 'success' : 'default'}
          size="small"
          variant="outlined"
        />
      )
    },
    {
      field: 'actions', 
      headerName: 'Actions', 
      width: 150, 
      sortable: false, 
      align: 'center', 
      headerAlign: 'center',
      renderCell: (params) => (
        (user?.role === 'Super Admin' || user?.role === 'Admin') && (
          <Stack direction="row" spacing={1} justifyContent="center">
            <Tooltip title="View History">
              <IconButton size="small" onClick={() => setHistoryProduct(params.row)} sx={{ color: 'info.main', bgcolor: 'info.50' }}>
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit Product">
              <IconButton size="small" onClick={() => openProductModalForEdit(params.row)} sx={{ color: 'primary.main', bgcolor: 'primary.50' }}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Adjust Stock">
              <IconButton 
                size="small" 
                onClick={() => setAdjustmentProduct(params.row)}
                disabled={params.row.status === 'inactive'} 
                sx={{ color: 'warning.main', bgcolor: 'warning.50' }}
              >
                <TuneIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )
      )
    }
  ];

  if (error) return <Typography color="error">{error}</Typography>;

  if (isLoading && products.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <LoadingSpinner text="Loading Inventory..." />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      
      <AnimatePresence>
        {isProductModalOpen && (
          <Dialog 
            open={isProductModalOpen} 
            onClose={() => setIsProductModalOpen(false)} 
            maxWidth="md" 
            fullWidth
            PaperProps={{ sx: { borderRadius: 3 } }}
          >
            <DialogTitle sx={{ fontWeight: 700 }}>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogContent>
              <ProductForm
                onFormSubmit={handleProductFormSubmit}
                productToEdit={editingProduct}
                onClose={() => setIsProductModalOpen(false)}
                onProductArchive={handleArchive}
              />
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
      
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

      <motion.div initial="hidden" animate="visible" variants={pageVariants}>
        
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'secondary.light', color: 'secondary.dark', display: 'flex' }}>
                <InventoryIcon size={24} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={700}>Inventory Management</Typography>
                <Typography variant="body2" color="text.secondary">Manage products, stock levels, and adjustments</Typography>
              </Box>
          </Stack>
          
          {user && (user.role === 'Super Admin' || user.role === 'Admin') && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openProductModalForAdd} sx={{ fontWeight: 600, px: 3 }}>
              Add Product
            </Button>
          )}
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 3, boxShadow: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField 
            label="Search Products" 
            placeholder="Search by name or code..."
            variant="outlined" 
            size="small" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            sx={{ flexGrow: 1, minWidth: '250px' }} 
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="action"/></InputAdornment>), sx: { borderRadius: 2 } }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select value={filterCategory} label="Category" onChange={(e) => setFilterCategory(e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value=""><em>All Categories</em></MenuItem>
              {categories.map(cat => <MenuItem key={cat._id} value={cat._id}>{cat.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Brand</InputLabel>
            <Select value={filterBrand} label="Brand" onChange={(e) => setFilterBrand(e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value=""><em>All Brands</em></MenuItem>
              {brands.map(brand => <MenuItem key={brand._id} value={brand._id}>{brand.name}</MenuItem>)}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value=""><em>All Statuses</em></MenuItem>
              <MenuItem value="active">Active Only</MenuItem>
              <MenuItem value="inactive">Archived Only</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Stock Level</InputLabel>
            <Select value={filterStockLevel} label="Stock Level" onChange={(e) => setFilterStockLevel(e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value=""><em>All Levels</em></MenuItem>
              <MenuItem value="Healthy">Healthy</MenuItem>
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Critical">Critical</MenuItem>
              <MenuItem value="Out of Stock">Out of Stock</MenuItem>
            </Select>
          </FormControl>
        </Paper>
        
        {/* Data Grid */}
        <Paper sx={{
            height: '70vh',
            width: '100%',
            borderRadius: 3,
            boxShadow: 3,
            overflow: 'hidden',
            '& .out-of-stock-row': {
              backgroundColor: '#fff0f0', // Slight red tint
              color: '#d32f2f',
              '&:hover': { backgroundColor: '#ffebee', }
            },
            '& .inactive-row': {
              backgroundColor: '#f5f5f5',
              color: '#bdbdbd',
              textDecoration: 'line-through',
              '&:hover': { backgroundColor: '#eeeeee', }
            },
            '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'grey.50',
                fontWeight: 700,
                fontSize: '0.9rem'
            },
            '& .MuiDataGrid-row:hover': {
                backgroundColor: 'action.hover'
            }
        }}>
          <DataGrid
            rows={filteredProducts}
            columns={columns}
            loading={isLoading}
            getRowId={(row) => row._id}
            initialState={{ 
              pagination: { paginationModel: { pageSize: 10 } },
              sorting: { sortModel: [{ field: 'status', sort: 'asc' }] }, 
            }}
            pageSizeOptions={[10, 25, 50]}
            getRowClassName={getRowClassName}
            disableRowSelectionOnClick
            rowHeight={70} // Increased height for images
          />
        </Paper>
      </motion.div>
    </Container>
  );
};

export default InventoryPage;