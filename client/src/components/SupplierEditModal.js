// client/src/components/SupplierEditModal.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api/axios'; 
import { 
  updateSupplier, 
  getSupplierOrderHistory,
  updateSupplierProductCatalog 
} from '../api/supplierApi'; 
import { toast } from 'react-toastify';
import { motion } from 'framer-motion'; // Added for dialog transition

// MUI Imports
import {
  Box, Button, TextField, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Tabs, Tab, Grid, Paper,
  Typography, InputAdornment, List, ListItem, ListItemText, IconButton,
  CircularProgress, Card, CardContent, CardMedia, Avatar,
  CardActionArea, Chip, Stack, Tooltip,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Link as MuiLink 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import NoPhotographyIcon from '@mui/icons-material/NoPhotography';
import SaveIcon from '@mui/icons-material/Save'; // Added Save Icon
import { grey } from '@mui/material/colors';
import { Link } from 'react-router-dom';

import LoadingSpinner from './LoadingSpinner'; // If you want consistent spinners

// --- TabPanel Component ---
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`supplier-tabpanel-${index}`}
      aria-labelledby={`supplier-tab-${index}`}
      {...other}
      style={{ height: '100%' }} // Ensure height fill
    >
      {value === index && (
        <Box sx={{ pt: 3, pb: 3, height: '100%', overflowY: 'auto' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// --- Product Catalog "POS" Component ---
const ProductCatalogEditor = ({ supplier, onClose }) => {
  const [allProducts, setAllProducts] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [allSuppliers, setAllSuppliers] = useState([]); 

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [productsRes, catalogRes, suppliersRes] = await Promise.all([
        api.get('/products'), 
        api.get(`/suppliers/${supplier._id}/products`), 
        api.get('/suppliers') 
      ]);
      setAllProducts(productsRes.data);
      setCatalog(catalogRes.data.map(item => ({...item, note: item.note || ''})));
      setAllSuppliers(suppliersRes.data);
    } catch (err) {
      toast.error('Failed to load product data.');
    } finally {
      setIsLoading(false);
    }
  }, [supplier._id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const availableProducts = useMemo(() => {
    const catalogIds = new Set(catalog.map(item => item.product._id));
    return allProducts.filter(p => 
      !catalogIds.has(p._id) &&
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      p.status === 'active'
    );
  }, [allProducts, catalog, searchTerm]);

  const handleAddProduct = (product) => {
    const otherCosts = product.supplierCosts
      .filter(sc => sc.supplier.toString() !== supplier._id)
      .map(sc => sc.cost);
    
    const suggestedCost = otherCosts.length > 0 ? Math.min(...otherCosts) : 0;
    
    setCatalog(prev => [
      ...prev,
      { product: product, cost: suggestedCost, note: '', _id: product._id } 
    ]);

    if (suggestedCost > 0) {
      toast.info(`Set initial cost to ₱${suggestedCost.toFixed(2)} based on other suppliers.`);
    }
  };

  const handleRemoveProduct = (productId) => {
    setCatalog(prev => prev.filter(item => item.product._id !== productId));
  };

  const handleItemChange = (productId, field, value) => {
    setCatalog(prev => 
      prev.map(item => {
        if (item.product._id === productId) {
          if (field === 'cost') {
            const newCost = parseFloat(value);
            return { ...item, cost: isNaN(newCost) ? '' : newCost };
          }
          return { ...item, [field]: value }; 
        }
        return item;
      })
    );
  };
  
  const handleCostFocus = (e) => {
    if (Number(e.target.value) === 0) {
      e.target.select();
    }
  };

  const handleSaveChanges = async () => {
    const invalidItem = catalog.find(item => item.cost === '' || isNaN(item.cost) || item.cost < 0);
    if (invalidItem) {
      toast.error(`Please enter a valid, non-negative cost for ${invalidItem.product.name}.`);
      return;
    }

    setIsSaving(true);
    try {
      const payload = catalog.map(item => ({
        product: item.product._id,
        cost: Number(item.cost),
        note: item.note 
      }));
      await updateSupplierProductCatalog(supplier._id, payload);
      toast.success("Supplier's product catalog updated!");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save catalog.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const getSupplierName = (supplierId) => {
    const sup = allSuppliers.find(s => s._id === supplierId);
    return sup ? sup.name : 'Unknown Supplier';
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><LoadingSpinner text="Loading Catalog..." /></Box>;
  }

  return (
    <Grid container spacing={2} sx={{ height: '100%' }}>
      {/* Left Side: Product Selection */}
      <Grid item size={{ xs: 12, md: 7 }} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <TextField
          fullWidth
          placeholder="Search All Products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          InputProps={{ 
              startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
              sx: { borderRadius: 2 }
          }}
        />
        <Paper variant="outlined" sx={{ mt: 2, flex: 1, overflowY: 'auto', p: 1, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Grid container spacing={1}>
            {availableProducts.length > 0 ? availableProducts.map(product => (
              <Grid item size={{ xs: 12, sm: 6, md: 4 }} key={product._id}>
                <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <CardActionArea 
                    onClick={() => handleAddProduct(product)}
                    sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1}} 
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 1, height: 100 }}>
                      {product.image ? (
                        <CardMedia
                          component="img"
                          sx={{ height: '100%', width: 'auto', maxWidth: '100%', objectFit: 'contain' }}
                          image={product.image}
                          alt={product.name}
                        />
                      ) : (
                        <Avatar variant="rounded" sx={{ width: 70, height: 70, bgcolor: grey[100] }}>
                          <NoPhotographyIcon color="action" />
                        </Avatar>
                      )}
                    </Box>
                    <CardContent sx={{ flexGrow: 1, p: 1.5, pt: 0.5, width: '100%' }}>
                      <Typography variant="body2" fontWeight="bold" gutterBottom noWrap title={product.name} sx={{ fontSize: '0.85rem' }}>
                        {product.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Stock: {product.quantity}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            )) : (
              <Box sx={{ p: 3, textAlign: 'center', width: '100%', opacity: 0.7 }}>
                <Typography variant="body2">No products found or all items added.</Typography>
              </Box>
            )}
          </Grid>
        </Paper>
      </Grid>

      {/* Right Side: Catalog List */}
      <Grid item size={{ xs: 12, md: 5 }} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} color="text.secondary">
            Current Catalog ({catalog.length})
            </Typography>
            <Button 
                variant="contained" 
                size="small"
                startIcon={<SaveIcon />}
                onClick={handleSaveChanges} 
                disabled={isSaving} 
                sx={{ borderRadius: 2 }}
            >
                Save
            </Button>
        </Box>
        
        <Paper variant="outlined" sx={{ flex: 1, overflowY: 'auto', borderRadius: 2 }}>
          <List dense>
            {catalog.length > 0 ? catalog.map(item => {
              const otherSupplierCosts = item.product.supplierCosts
                .filter(sc => sc.supplier.toString() !== supplier._id)
                .sort((a, b) => a.cost - b.cost); 
              
              return (
                <ListItem
                  key={item.product._id}
                  divider
                  sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'flex-start' }}
                >
                  <Avatar 
                    variant="rounded" 
                    src={item.product.image} 
                    sx={{ width: 50, height: 50, bgcolor: grey[100] }}
                  >
                    <NoPhotographyIcon color="action" />
                  </Avatar>

                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Typography fontWeight="bold" variant="body2">{item.product.name}</Typography>
                      <IconButton 
                        edge="end" 
                        size="small" 
                        onClick={() => handleRemoveProduct(item.product._id)}
                        sx={{ ml: 1, color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    <TextField
                      label="Cost (₱)"
                      size="small"
                      type="number"
                      value={item.cost}
                      onFocus={handleCostFocus}
                      onChange={(e) => handleItemChange(item.product._id, 'cost', e.target.value)}
                      variant="outlined"
                      sx={{ mt: 1, width: '100%' }}
                    />

                    <TextField
                      placeholder="Note (e.g. quality, variant)"
                      size="small"
                      value={item.note}
                      onChange={(e) => handleItemChange(item.product._id, 'note', e.target.value)}
                      variant="standard"
                      fullWidth
                      sx={{ mt: 1 }}
                    />

                    {otherSupplierCosts.length > 0 && (
                      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">Others:</Typography>
                        {otherSupplierCosts.map(sc => (
                          <Tooltip key={sc.supplier} title={`From: ${getSupplierName(sc.supplier)}`}>
                            <Chip
                              label={`₱${sc.cost.toFixed(2)}`}
                              onClick={() => handleItemChange(item.product._id, 'cost', sc.cost)}
                              size="small"
                              variant="outlined"
                              color="primary"
                              clickable
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          </Tooltip>
                        ))}
                      </Box>
                    )}
                  </Box>
                </ListItem>
              );
            }) : (
              <Box sx={{ p: 4, textAlign: 'center', opacity: 0.6 }}>
                <Typography variant="body2">Catalog is empty.</Typography>
                <Typography variant="caption">Select products from the left to add.</Typography>
              </Box>
            )}
          </List>
        </Paper>
      </Grid>
    </Grid>
  );
};


// --- Order History Tab ---
const OrderHistory = ({ supplier }) => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const data = await getSupplierOrderHistory(supplier._id);
        setHistory(data);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load order history.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [supplier._id]);

  const formatCurrency = (amount) => `₱${Number(amount || 0).toFixed(2)}`;
  
  const getStatusChip = (status) => {
    const colorMap = {
      'Pending': 'warning',
      'Awaiting Approval': 'primary',
      'Approved': 'info',
      'Agreement Uploaded - Awaiting Delivery': 'info',
      'Partially Received': 'secondary',
      'Completed': 'success',
      'Cancelled': 'error',
    };
    return <Chip label={status} color={colorMap[status] || 'default'} size="small" variant="filled" sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600 }} />;
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><LoadingSpinner text="Loading History..." /></Box>;
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ height: '100%', overflowY: 'auto', borderRadius: 2 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {history.length > 0 ? history.map(item => (
            <TableRow hover key={item._id}>
              <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
              <TableCell>{item.type}</TableCell>
              <TableCell>
                {item.type.startsWith('PO') ? (
                  <MuiLink component={Link} to={`/purchase-orders/${item._id}`} underline="hover" fontWeight={500}>
                    {item.reference}
                  </MuiLink>
                ) : (
                  item.reference
                )}
              </TableCell>
              <TableCell>{getStatusChip(item.status)}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(item.amount)}</TableCell>
            </TableRow>
          )) : (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                No order history found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};


// --- Main Modal Component ---
const SupplierEditModal = ({ open, onClose, onFormSubmit, supplierToEdit }) => {
  const [tabValue, setTabValue] = useState(0);
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '', email: '', contactPerson: '', contactNumber: '',
    address: '', defaultPaymentTerms: 'Cash', status: 'Pending'
  });
  const [error, setError] = useState('');
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  useEffect(() => {
    if (supplierToEdit) {
      setCurrentSupplier(supplierToEdit);
      setFormData({
        name: supplierToEdit.name || '',
        email: supplierToEdit.email || '',
        contactPerson: supplierToEdit.contactPerson || '',
        contactNumber: supplierToEdit.contactNumber || '',
        address: supplierToEdit.address || '',
        defaultPaymentTerms: supplierToEdit.defaultPaymentTerms || 'Cash',
        status: supplierToEdit.status || 'Pending'
      });
      setTabValue(0); 
    } else {
      setCurrentSupplier(null);
      setFormData({ 
        name: '', email: '', contactPerson: '', contactNumber: '', 
        address: '', defaultPaymentTerms: 'Cash', status: 'Pending' 
      });
      setTabValue(0); 
    }
  }, [supplierToEdit, open]); 

  const handleTabChange = (event, newValue) => {
    if (!currentSupplier) {
      toast.info('Please save the supplier details first to manage their product catalog.');
      return;
    }
    setTabValue(newValue);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleInfoSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSavingInfo(true);
    try {
      let res;
      if (currentSupplier) {
        res = await updateSupplier(currentSupplier._id, formData);
        setCurrentSupplier(res.data);
        toast.success('Supplier details updated!');
      } else {
        res = await api.post('/suppliers', formData);
        setCurrentSupplier(res.data);
        toast.success('Supplier created! You can now manage their catalog and history.');
      }
      
      onFormSubmit(res.data); 
      setTabValue(1); // Move to "Product Catalog"
      
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred.');
    } finally {
      setIsSavingInfo(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="lg"
      PaperProps={{
        component: motion.div,
        initial: { opacity: 0, y: 50 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 50 },
        transition: { duration: 0.3 },
        sx: { height: '85vh', borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        {currentSupplier ? `Edit Supplier: ${currentSupplier.name}` : 'Add New Supplier'}
      </DialogTitle>
      
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="supplier edit tabs">
            <Tab label="Supplier Info" id="supplier-tab-0" sx={{ fontWeight: 600 }} />
            <Tab label="Product Catalog" id="supplier-tab-1" disabled={!currentSupplier} sx={{ fontWeight: 600 }} />
            <Tab label="Order History" id="supplier-tab-2" disabled={!currentSupplier} sx={{ fontWeight: 600 }} />
          </Tabs>
        </Box>

        {/* --- Tab 1: Supplier Info Form --- */}
        <TabPanel value={tabValue} index={0}>
          <Box component="form" onSubmit={handleInfoSubmit} sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
            <Grid container spacing={3}>
              {error && (
                <Grid item size={{ xs: 12 }}>
                  <Alert severity="error">{error}</Alert>
                </Grid>
              )}
              <Grid item size={{ xs: 12, sm: 6 }}>
                <TextField
                  autoFocus
                  required
                  name="name"
                  label="Supplier Name"
                  fullWidth
                  value={formData.name}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="email"
                  label="Email Address"
                  type="email"
                  fullWidth
                  value={formData.email}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="contactPerson"
                  label="Contact Person"
                  fullWidth
                  value={formData.contactPerson}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="contactNumber"
                  label="Contact Number"
                  fullWidth
                  value={formData.contactNumber}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item size={{ xs: 12 }}>
                <TextField
                  name="address"
                  label="Address"
                  fullWidth
                  value={formData.address}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id="defaultPaymentTerms-select-label">Default Payment Terms</InputLabel>
                  <Select
                    labelId="defaultPaymentTerms-select-label"
                    name="defaultPaymentTerms"
                    value={formData.defaultPaymentTerms}
                    label="Default Payment Terms"
                    onChange={handleChange}
                  >
                    <MenuItem value="Cash">Cash</MenuItem>
                    <MenuItem value="Consignment">Consignment</MenuItem>
                    <MenuItem value="Terms">Terms</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id="status-select-label">Status</InputLabel>
                  <Select
                    labelId="status-select-label"
                    name="status"
                    value={formData.status}
                    label="Status"
                    onChange={handleChange}
                  >
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="Approved">Approved</MenuItem>
                    <MenuItem value="Rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <DialogActions sx={{ pt: 4, pr: 0 }}>
              <Button onClick={onClose} variant="outlined" color="inherit">Cancel</Button>
              <Button type="submit" variant="contained" disabled={isSavingInfo} sx={{ fontWeight: 600 }}>
                {isSavingInfo ? <CircularProgress size={24} /> : (currentSupplier ? 'Update Details' : 'Create & Continue')}
              </Button>
            </DialogActions>
          </Box>
        </TabPanel>

        {/* --- Tab 2: Product Catalog Editor --- */}
        <TabPanel value={tabValue} index={1}>
          {currentSupplier ? (
            <Box sx={{ p: 3, height: '100%' }}>
                <ProductCatalogEditor supplier={currentSupplier} onClose={onClose} />
            </Box>
          ) : (
            <Typography>Please save supplier details first.</Typography>
          )}
        </TabPanel>

        {/* --- Tab 3: Order History --- */}
        <TabPanel value={tabValue} index={2}>
          {currentSupplier ? (
            <Box sx={{ p: 3, height: '100%' }}>
                <OrderHistory supplier={currentSupplier} />
            </Box>
          ) : (
            <Typography>Please save supplier details first.</Typography>
          )}
        </TabPanel>

      </DialogContent>
    </Dialog>
  );
};

export default SupplierEditModal;