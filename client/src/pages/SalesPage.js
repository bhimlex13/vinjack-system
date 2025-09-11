// client/src/pages/SalesPage.js
import React, { useState, useEffect, useContext, useMemo } from 'react';
import api from '../api/axios';
import AuthContext from '../context/AuthContext';
import ReceiptModal from '../components/ReceiptModal';
import ConfirmationContext from '../context/ConfirmationContext';
import { getServices } from '../api/serviceApi';
import { getCustomers, createCustomer } from '../api/customerApi';
import { getMotorcyclesByCustomer, createMotorcycle } from '../api/motorcycleApi';
import AddServiceModal from '../components/AddServiceModal';
import CustomerForm from '../components/CustomerForm';
import MotorcycleForm from '../components/MotorcycleForm';
import { grey } from '@mui/material/colors';

// MUI Imports
import {
  Box, Grid, Paper, TextField, InputAdornment, Typography, Card, CardActionArea,
  CardMedia, CardContent, ToggleButtonGroup, ToggleButton, List, ListItem,
  ListItemText, IconButton, Divider, Button, Tooltip, Autocomplete, Stack,
  Dialog, DialogTitle, CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import { FaUserTag } from 'react-icons/fa';


const SalesPage = () => {
  // Customer State
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  
  // Motorcycle State
  const [customerMotorcycles, setCustomerMotorcycles] = useState([]);
  const [selectedMotorcycle, setSelectedMotorcycle] = useState(null);
  const [isFetchingMotorcycles, setIsFetchingMotorcycles] = useState(false);
  const [isMotorcycleModalOpen, setIsMotorcycleModalOpen] = useState(false);
  
  // Existing state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [services, setServices] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { user } = useContext(AuthContext);
  const { confirm } = useContext(ConfirmationContext);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastSaleData, setLastSaleData] = useState(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

  const fetchMotorcycles = async (customerId) => {
    setIsFetchingMotorcycles(true);
    try {
      const data = await getMotorcyclesByCustomer(customerId);
      setCustomerMotorcycles(data);
      return data;
    } catch (err) {
      console.error("Failed to fetch motorcycles", err);
      setCustomerMotorcycles([]);
    } finally {
      setIsFetchingMotorcycles(false);
    }
  };

  useEffect(() => {
    if (selectedCustomer) {
      fetchMotorcycles(selectedCustomer._id);
    } else {
      setCustomerMotorcycles([]);
      setSelectedMotorcycle(null);
    }
  }, [selectedCustomer]);

  const fetchCustomers = async () => {
    try {
      const customersRes = await getCustomers();
      setCustomers(customersRes);
      return customersRes;
    } catch (error) {
      console.error("Failed to fetch customers", error);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [productsRes, categoriesRes, brandsRes, servicesRes] = await Promise.all([
          api.get('/products'),
          api.get('/categories'),
          api.get('/brands'),
          getServices('active'),
        ]);
        setProducts(productsRes.data);
        setCategories(categoriesRes.data);
        setBrands(brandsRes.data);
        setServices(servicesRes);
        fetchCustomers();
      } catch (error) {
        console.error("Failed to fetch initial data", error);
      }
    };
    fetchInitialData();
  }, []);

  const handleNewCustomerSubmit = async (newCustomerData) => {
    try {
      const newCustomer = await createCustomer(newCustomerData);
      await fetchCustomers();
      setSelectedCustomer(newCustomer);
      setIsCustomerModalOpen(false);
    } catch (error) {
      console.error("Failed to create new customer", error);
    }
  };
  
  const handleNewMotorcycleSubmit = async (newMotorcycleData) => {
    try {
        const newMotorcycle = await createMotorcycle(newMotorcycleData);
        await fetchMotorcycles(selectedCustomer._id);
        setSelectedMotorcycle(newMotorcycle);
        setIsMotorcycleModalOpen(false);
    } catch (error) {
        console.error("Failed to create new motorcycle", error);
    }
  };


  const addProductToCart = (product) => {
    const productInState = products.find(p => p._id === product._id);
    if (!productInState || productInState.quantity <= 0) return;

    setCartItems(prevCart => {
      const existingItem = prevCart.find(item => item.type === 'product' && item._id === product._id);
      if (existingItem) {
        if (existingItem.cartQuantity < existingItem.stock) {
          return prevCart.map(item =>
            item._id === product._id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item
          );
        }
        return prevCart;
      } else {
        return [...prevCart, { ...product, cartQuantity: 1, stock: product.quantity, type: 'product' }];
      }
    });

    setProducts(prevProducts =>
      prevProducts.map(p =>
        p._id === product._id ? { ...p, quantity: p.quantity - 1 } : p
      )
    );
  };

  const addServiceToCart = (service) => {
    setCartItems(prevCart => {
      const existingItem = prevCart.find(item => item.type === 'service' && item._id === service._id);
      if (existingItem) {
        return prevCart;
      }
      return [...prevCart, { ...service, type: 'service' }];
    });
    setIsServiceModalOpen(false);
  };

  const removeServiceFromCart = (serviceId) => {
    setCartItems(prevCart => prevCart.filter(item => item._id !== serviceId));
  };


  const updateQuantity = (product, amount) => {
    setCartItems(prevCart => {
      const existingItem = prevCart.find(item => item.type === 'product' && item._id === product._id);
      if (!existingItem) return prevCart;

      const newQuantity = existingItem.cartQuantity + amount;

      if (newQuantity <= 0) {
        const productInList = products.find(p => p._id === product._id);
        if (productInList) {
          setProducts(prevProducts =>
            prevProducts.map(p =>
              p._id === product._id ? { ...p, quantity: p.quantity + existingItem.cartQuantity } : p
            )
          );
        }
        return prevCart.filter(item => item._id !== product._id);
      }

      if (newQuantity <= existingItem.stock) {
        setProducts(prevProducts =>
          prevProducts.map(p =>
            p._id === product._id ? { ...p, quantity: p.quantity - amount } : p
          )
        );
        return prevCart.map(item =>
          item._id === product._id ? { ...item, cartQuantity: newQuantity } : item
        );
      }
      return prevCart;
    });
  };

  const calculateTotal = useMemo(() => {
    return cartItems.reduce((total, item) => {
      if (item.type === 'product') {
        return total + item.price * item.cartQuantity;
      }
      if (item.type === 'service') {
        return total + item.charge;
      }
      return total;
    }, 0);
  }, [cartItems]);

  const handleCompleteSale = async () => {
    if (cartItems.length === 0) return;

    const isConfirmed = await confirm(`Complete sale for a total of ₱${calculateTotal.toFixed(2)}? This action cannot be undone.`);

    if (isConfirmed) {
      const saleData = {
        items: cartItems
          .filter(item => item.type === 'product')
          .map(item => ({ product: item._id, quantity: item.cartQuantity, priceAtTime: item.price })),
        services: cartItems
          .filter(item => item.type === 'service')
          .map(item => ({ service: item._id, priceAtTime: item.charge })),
        recordedBy: user._id,
        customerId: selectedCustomer ? selectedCustomer._id : undefined,
        motorcycleId: selectedMotorcycle ? selectedMotorcycle._id : undefined,
      };
      
      try {
        const response = await api.post('/sales', saleData);
        setLastSaleData(response.data);
        setShowReceiptModal(true);
        setCartItems([]);
        setSelectedCustomer(null); 
        setSelectedMotorcycle(null);
        setCustomerMotorcycles([]);
        const productsResponse = await api.get('/products');
        setProducts(productsResponse.data);
      } catch (error) {
        alert(`Sale failed: ${error.response?.data?.message || error.message}`);
        const productsResponse = await api.get('/products');
        setProducts(productsResponse.data);
      }
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
        const searchMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
        const brandMatch = selectedBrand ? product.brand._id === selectedBrand : true;
        const categoryMatch = selectedCategory ? product.category._id === selectedCategory : true;
        return searchMatch && brandMatch && categoryMatch;
    });
  }, [products, searchTerm, selectedBrand, selectedCategory]);

  const handleFilterChange = (setter) => (event, newValue) => {
    setter(newValue);
  };

  return (
    <Box sx={{ display: 'flex', height: '100%', gap: 2}}>
    
      {/* Left Column: Product Selection */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column'}}>
        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%'}}>
          <TextField
            fullWidth label="Search Products" variant="outlined" size="small" value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>), }}
            sx={{ mb: 1 }}
          />
          <Box sx={{ mb: 1 }}>
            <ToggleButtonGroup value={selectedCategory} exclusive onChange={handleFilterChange(setSelectedCategory)} size="small" fullWidth sx={{ display: 'flex' }}>
              <ToggleButton value={null} sx={{ flex: 1 }}>All</ToggleButton>
              {categories.map(cat => <ToggleButton key={cat._id} value={cat._id} sx={{ flex: 1 }}>{cat.name}</ToggleButton>)}
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ mb: 2 }}>
            <ToggleButtonGroup value={selectedBrand} exclusive onChange={handleFilterChange(setSelectedBrand)} size="small" fullWidth sx={{ display: 'flex' }}>
                <ToggleButton value={null} sx={{ flex: 1 }}>All</ToggleButton>
                {brands.map(brand => <ToggleButton key={brand._id} value={brand._id} sx={{ flex: 1 }}>{brand.name}</ToggleButton>)}
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
            <Grid container spacing={2}>
              {filteredProducts.map(product => (
                <Grid item key={product._id} size={{ xs: 12, sm: 4, md: 3, lg: 2 }}>
                  <Card sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    ...(product.quantity === 0 && {
                      backgroundColor: grey[300],
                      cursor: 'not-allowed'
                    })
                  }}>
                    <CardActionArea 
                      onClick={() => addProductToCart(product)} 
                      disabled={product.quantity === 0}
                      sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1}} 
                    >
                      <CardMedia
                        component="img" height="120" image={product.image || 'https://placehold.co/300x200'}
                        alt={product.name}
                        sx={{
                          objectFit: 'contain',
                          p: 1,
                          ...(product.quantity === 0 && {
                            filter: 'grayscale(100%)'
                          })
                        }}
                      />
                      {product.quantity === 0 && (
                        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '120px', backgroundColor: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                          <Typography variant="button" color="error" sx={{ fontWeight: 'bold'}}>Out of Stock</Typography>
                        </Box>
                      )}
                      <CardContent sx={{ p: 1, flexGrow: 1, width: '100%' }}>
                        <Typography gutterBottom variant="body2" component="div" sx={{ fontWeight: 'bold', minHeight: '40px' }}>
                          {product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Stock: {product.quantity}
                        </Typography>
                      </CardContent>
                      <Box sx={{ p: 1, pt: 0, width: '100%', mt: 'auto' }}>
                         <Typography variant="h6" color="primary.main">
                          ₱{product.price.toFixed(2)}
                        </Typography>
                      </Box>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Paper>
      </Box>

      {/* Right Column: Cart */}
      <Box sx={{ width: '380px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <FaUserTag style={{ marginRight: '8px' }} /> Customer Details
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Autocomplete
                sx={{ flexGrow: 1 }}
                options={customers}
                getOptionLabel={(option) => option.name}
                value={selectedCustomer}
                onChange={(event, newValue) => {
                  setSelectedCustomer(newValue);
                }}
                isOptionEqualToValue={(option, value) => option._id === value._id}
                renderInput={(params) => <TextField {...params} label="Select a Customer (Optional)" size="small" />}
              />
              <Button variant="outlined" size="small" onClick={() => setIsCustomerModalOpen(true)}>
                New
              </Button>
            </Stack>
            
            {selectedCustomer && (
              <Box sx={{ mt: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Autocomplete
                    sx={{ flexGrow: 1 }}
                    options={customerMotorcycles}
                    loading={isFetchingMotorcycles}
                    getOptionLabel={(option) => `${option.make} ${option.model} (${option.plateNumber || 'No Plate'})`}
                    value={selectedMotorcycle}
                    onChange={(event, newValue) => {
                      setSelectedMotorcycle(newValue);
                    }}
                    isOptionEqualToValue={(option, value) => option._id === value._id}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        label="Select Motorcycle (Optional)" 
                        size="small"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {isFetchingMotorcycles ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                  <Button variant="outlined" size="small" onClick={() => setIsMotorcycleModalOpen(true)}>
                    New
                  </Button>
                </Stack>
              </Box>
            )}

          </Box>
          <Divider sx={{ mb: 1 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}><ShoppingCartIcon sx={{ mr: 1 }}/> Current Sale</Typography>
              <Button variant="outlined" size="small" startIcon={<DesignServicesIcon />} onClick={() => setIsServiceModalOpen(true)}>
                  Add Service
              </Button>
          </Box>
          <Divider sx={{ mb: 1 }} />
          <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
            {cartItems.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>Cart is empty</Typography>
            ) : (
              <List>
                {cartItems.map(item => (
                  <ListItem key={item._id} disablePadding>
                    {item.type === 'product' ? (
                      <>
                        <ListItemText 
                          primary={item.name} 
                          secondary={`₱${(item.price * item.cartQuantity).toFixed(2)}`} 
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <IconButton size="small" onClick={() => updateQuantity(item, -1)}><RemoveIcon fontSize="small"/></IconButton>
                          <Typography sx={{ mx: 1 }}>{item.cartQuantity}</Typography>
                          <IconButton size="small" onClick={() => updateQuantity(item, 1)} disabled={item.cartQuantity >= item.stock}><AddIcon fontSize="small"/></IconButton>
                        </Box>
                      </>
                    ) : (
                      <>
                        <ListItemText 
                          primary={item.name}
                          secondary={`₱${(item.charge).toFixed(2)}`}
                        />
                        <Tooltip title="Remove Service">
                          <IconButton size="small" edge="end" aria-label="delete" onClick={() => removeServiceFromCart(item._id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ mt: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Total</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>₱{calculateTotal.toFixed(2)}</Typography>
            </Box>
            <Button 
              variant="contained" color="success" fullWidth size="large"
              startIcon={<PointOfSaleIcon />}
              onClick={handleCompleteSale}
              disabled={cartItems.length === 0}
            >
              Complete Sale
            </Button>
          </Box>
        </Paper>
      </Box>

      {selectedCustomer && (
        <Dialog open={isMotorcycleModalOpen} onClose={() => setIsMotorcycleModalOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Add New Motorcycle for {selectedCustomer.name}</DialogTitle>
            <MotorcycleForm
                customer={selectedCustomer}
                onFormSubmit={handleNewMotorcycleSubmit}
                onClose={() => setIsMotorcycleModalOpen(false)}
            />
        </Dialog>
      )}

      <Dialog open={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Customer</DialogTitle>
        <CustomerForm 
          onClose={() => setIsCustomerModalOpen(false)}
          onFormSubmit={handleNewCustomerSubmit}
        />
      </Dialog>
      {showReceiptModal && lastSaleData && (
        <ReceiptModal saleData={lastSaleData} onClose={() => setShowReceiptModal(false)} />
      )}
      <AddServiceModal
        open={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        services={services}
        onAddService={addServiceToCart}
        cartItems={cartItems}
      />
    </Box>
  );
};

export default SalesPage;