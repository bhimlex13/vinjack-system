// client/src/pages/InventoryPage.js
import React, { useState, useEffect, useMemo, useContext } from 'react';
import api from '../api/axios';
import ProductForm from '../components/ProductForm';
import AuthContext from '../context/AuthContext';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import MovementHistoryModal from '../components/MovementHistoryModal';
import StockGauge from '../components/StockGauge';
import { motion, AnimatePresence } from 'framer-motion'; // --- NEW IMPORT ---

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
// import SyncIcon from '@mui/icons-material/Sync'; // Kept commented out as per original code

// --- NEW IMPORT ---
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
  // ------------------------------

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

  const handleSyncStatuses = async () => {
    const isConfirmed = window.confirm(
      "Are you sure you want to recalculate all product stock statuses? This will fix any out-of-sync items based on their current quantity and max stock."
    );
    if (isConfirmed) {
      setIsLoading(true);
      try {
        const response = await api.post('/products/recalculate-statuses');
        alert(response.data.message || "Statuses re-synced successfully!");
        await fetchInitialData(); 
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to sync statuses.');
        setIsLoading(false); 
      }
    }
  };

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
    { field: 'image', headerName: 'Image', width: 80, renderCell: (params) => <Avatar variant="rounded" src={params.row?.image || 'https://placehold.co/60x40'} />, sortable: false },
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
      field: 'actions', headerName: 'Actions', width: 180, sortable: false, align: 'center', headerAlign: 'center',
      renderCell: (params) => (
        (user?.role === 'Super Admin' || user?.role === 'Admin') && (
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
              <IconButton 
                size="small" 
                color="secondary" 
                onClick={() => setAdjustmentProduct(params.row)}
                disabled={params.row.status === 'inactive'} 
              >
                <TuneIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )
      )
    }
  ];

  if (error) return <Typography color="error">{error}</Typography>;

  // --- RENDER LOADING SPINNER ---
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
            // PaperProps={{ component: motion.div, initial: { y: 50, opacity: 0 }, animate: { y: 0, opacity: 1 } }}
          >
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
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

      {/* --- ANIMATED PAGE CONTENT --- */}
      <motion.div initial="hidden" animate="visible" variants={pageVariants}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            Inventory Management
          </Typography>
          
          <Stack direction="row" spacing={2}>
            {(user?.role === 'Super Admin' || user?.role === 'Admin') && (
              <Tooltip title="Recalculate stock status for all products">
                {/* <Button 
                  variant="outlined" 
                  startIcon={<SyncIcon />} 
                  onClick={handleSyncStatuses}
                >
                  Sync Statuses
                </Button> */}
              </Tooltip>
            )}
            
            {user && (user.role === 'Super Admin' || user.role === 'Admin') && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={openProductModalForAdd}>
                Add New Product
              </Button>
            )}
          </Stack>
        </Box>

        <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField label="Search" variant="outlined" size="small" value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            sx={{ flexGrow: 1, minWidth: '200px' }} 
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>), }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Category</InputLabel>
            <Select value={filterCategory} label="Category" onChange={(e) => setFilterCategory(e.target.value)}>
              <MenuItem value=""><em>All Categories</em></MenuItem>
              {categories.map(cat => <MenuItem key={cat._id} value={cat._id}>{cat.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Brand</InputLabel>
            <Select value={filterBrand} label="Brand" onChange={(e) => setFilterBrand(e.target.value)}>
              <MenuItem value=""><em>All Brands</em></MenuItem>
              {brands.map(brand => <MenuItem key={brand._id} value={brand._id}>{brand.name}</MenuItem>)}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Status</InputLabel>
            <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
              <MenuItem value=""><em>All Statuses</em></MenuItem>
              <MenuItem value="active">Active Only</MenuItem>
              <MenuItem value="inactive">Archived Only</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Stock Level</InputLabel>
            <Select value={filterStockLevel} label="Stock Level" onChange={(e) => setFilterStockLevel(e.target.value)}>
              <MenuItem value=""><em>All Levels</em></MenuItem>
              <MenuItem value="Healthy">Healthy</MenuItem>
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Critical">Critical</MenuItem>
              <MenuItem value="Out of Stock">Out of Stock</MenuItem>
            </Select>
          </FormControl>
        </Paper>
        
        <Paper sx={{
            height: '70vh',
            width: '100%',
            '& .out-of-stock-row': {
              backgroundColor: '#fafafa',
              color: '#9e9e9e',
              '&:hover': { backgroundColor: '#f0f0f0', }
            },
            '& .inactive-row': {
              backgroundColor: '#f5f5f5',
              color: '#bdbdbd',
              textDecoration: 'line-through',
              '&:hover': { backgroundColor: '#eeeeee', }
            },
        }}>
          <DataGrid
            rows={filteredProducts}
            columns={columns}
            loading={isLoading}
            getRowId={(row) => row._id}
            initialState={{ 
              sorting: { sortModel: [{ field: 'status', sort: 'asc' }] }, 
            }}
            getRowClassName={getRowClassName}
          />
        </Paper>
      </motion.div>
    </Container>
  );
};

export default InventoryPage;