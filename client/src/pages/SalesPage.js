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
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

// MUI Imports
import {
  Box, Grid, Paper, TextField, InputAdornment, Typography, Card, CardActionArea,
  CardMedia, CardContent, ToggleButtonGroup, ToggleButton, List, ListItem,
  ListItemText, IconButton, Divider, Button, Tooltip, Autocomplete, Stack,
  Dialog, DialogTitle, CircularProgress, Checkbox, DialogContent, DialogActions, FormControlLabel,
  ListItemAvatar, Avatar // --- NEW: For Cart Images ---
} from '@mui/material';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import BuildIcon from '@mui/icons-material/Build'; // --- NEW: Wrench for Services ---
import InventoryIcon from '@mui/icons-material/Inventory'; // --- NEW: Fallback for Products ---
import { FaUserTag } from 'react-icons/fa';

import LoadingSpinner from '../components/LoadingSpinner';

const getInitialCartState = () => {
  try {
    const savedCart = localStorage.getItem('salesCart');
    if (savedCart) {
      const parsedCart = JSON.parse(savedCart);
      if (Array.isArray(parsedCart.items)) {
        return {
          items: parsedCart.items,
          customer: parsedCart.customer || null,
          motorcycle: parsedCart.motorcycle || null,
        };
      }
    }
  } catch (error) {
    console.error("Failed to parse cart from localStorage", error);
  }
  return { items: [], customer: null, motorcycle: null };
};

const SalesPage = () => {
  const [initialCart] = useState(getInitialCartState);
  const [cartItems, setCartItems] = useState(initialCart.items);
  const [selectedCustomer, setSelectedCustomer] = useState(initialCart.customer);
  const [selectedMotorcycle, setSelectedMotorcycle] = useState(initialCart.motorcycle);

  const [customers, setCustomers] = useState([]);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  
  const [customerMotorcycles, setCustomerMotorcycles] = useState([]);
  const [isFetchingMotorcycles, setIsFetchingMotorcycles] = useState(false);
  const [isMotorcycleModalOpen, setIsMotorcycleModalOpen] = useState(false);
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [services, setServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { user } = useContext(AuthContext);
  const { confirm } = useContext(ConfirmationContext);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastSaleData, setLastSaleData] = useState(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

  const [isSerialModalOpen, setIsSerialModalOpen] = useState(false);
  const [currentSerializedProduct, setCurrentSerializedProduct] = useState(null);
  const [selectedSerials, setSelectedSerials] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);

  // --- FRAMER MOTION VARIANTS ---
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05 
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0, scale: 0.95 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 12
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9, 
      transition: { duration: 0.2 } 
    }
  };

  const cartItemVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { 
      opacity: 1, 
      x: 0, 
      transition: { type: 'spring', stiffness: 300, damping: 30 } 
    },
    exit: { 
      opacity: 0, 
      x: 50, 
      transition: { duration: 0.2 } 
    }
  };

  const expandVariants = {
    hidden: { opacity: 0, height: 0, overflow: 'hidden' },
    visible: { 
      opacity: 1, 
      height: 'auto', 
      transition: { duration: 0.3, ease: "easeOut" } 
    },
    exit: { 
      opacity: 0, 
      height: 0, 
      transition: { duration: 0.2, ease: "easeIn" } 
    }
  };
  // ------------------------------

  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL);

    socket.on('customer_added', (newCustomer) => {
      setCustomers(prevCustomers => {
        if (prevCustomers.some(c => c._id === newCustomer._id)) {
          return prevCustomers;
        }
        return [...prevCustomers, newCustomer];
      });
    });

    socket.on('motorcycle_added', (newMotorcycle) => {
      if (selectedCustomer && selectedCustomer._id === newMotorcycle.owner) {
        fetchMotorcycles(selectedCustomer._id);
      }
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer]);

  useEffect(() => {
    const cartData = {
      items: cartItems, customer: selectedCustomer, motorcycle: selectedMotorcycle,
    };
    localStorage.setItem('salesCart', JSON.stringify(cartData));
  }, [cartItems, selectedCustomer, selectedMotorcycle]);


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
      setIsLoading(true);
      try {
        const [productsRes, categoriesRes, brandsRes, servicesRes, customersRes] = await Promise.all([
          api.get('/products'), api.get('/categories'), api.get('/brands'),
          getServices('active'), getCustomers(),
        ]);
        
        let activeProductsData = productsRes.data.filter(p => p.status === 'active');

        if (cartItems.length > 0) {
          activeProductsData = activeProductsData.map(product => {
            const itemInCart = cartItems.find(item => item.type === 'product' && item._id === product._id);
            if (itemInCart) {
              const newQuantity = Math.max(0, product.quantity - itemInCart.cartQuantity); 
              return { ...product, quantity: newQuantity };
            }
            return product;
          });
        }
        
        setProducts(activeProductsData);
        setCategories(categoriesRes.data);
        setBrands(brandsRes.data);
        setServices(servicesRes);
        setCustomers(customersRes);

        if (selectedCustomer) {
          const freshCustomer = customersRes.find(c => c._id === selectedCustomer._id);
          if (freshCustomer) setSelectedCustomer(freshCustomer);
        }
        if (selectedCustomer && selectedMotorcycle) {
          const freshMotorcycles = await getMotorcyclesByCustomer(selectedCustomer._id);
          const freshMotorcycle = freshMotorcycles.find(m => m._id === selectedMotorcycle._id);
          if (freshMotorcycle) setSelectedMotorcycle(freshMotorcycle);
        }
      } catch (error) {
        console.error("Failed to fetch initial data", error);
      } finally {
        setIsLoading(false); 
      }
    };
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewCustomerSubmit = async (newCustomerData) => {
    try {
      const createdCustomer = await createCustomer(newCustomerData);
      setCustomers(prev => [...prev, createdCustomer]);
      setSelectedCustomer(createdCustomer);
      setIsCustomerModalOpen(false);
    } catch (error) {
      console.error("Failed to create new customer", error);
    }
  };
  
  const handleNewMotorcycleSubmit = async (newMotorcycleData) => {
    try {
        const createdMotorcycle = await createMotorcycle(newMotorcycleData);
        const updatedMotorcyclesList = await fetchMotorcycles(selectedCustomer._id);
        const newMotorcycleInList = updatedMotorcyclesList.find(m => m._id === createdMotorcycle._id);
        setSelectedMotorcycle(newMotorcycleInList);
        setIsMotorcycleModalOpen(false);
    } catch (error) {
        console.error("Failed to create new motorcycle", error);
    }
  };

  const addProductToCart = (product) => {
    if(product.status !== 'active') return; 

    const productInState = products.find(p => p._id === product._id);
    if (!productInState || productInState.quantity <= 0) return;

    if (product.isSerialized) {
      setCurrentSerializedProduct(product);
      setSelectedSerials([]);
      setIsSerialModalOpen(true);
      return; 
    }

    addToCartLogic(product, 1);
  };

  const addToCartLogic = (product, qty, serials = []) => {
    setCartItems(prevCart => {
      const existingItem = prevCart.find(item => item.type === 'product' && item._id === product._id);
      
      if (existingItem) {
        const updatedSerials = existingItem.serialNumbers 
            ? [...existingItem.serialNumbers, ...serials] 
            : serials;

        if (existingItem.cartQuantity + qty <= existingItem.stock) { 
          return prevCart.map(item =>
            item._id === product._id ? { 
                ...item, 
                cartQuantity: item.cartQuantity + qty,
                serialNumbers: updatedSerials 
            } : item
          );
        }
        return prevCart; 
      } else {
        return [...prevCart, { 
            ...product, 
            cartQuantity: qty, 
            stock: product.quantity, // Snapshot of stock
            type: 'product',
            serialNumbers: serials // Store serials
        }];
      }
    });

    setProducts(prevProducts =>
      prevProducts.map(p =>
        p._id === product._id ? { ...p, quantity: p.quantity - qty } : p
      )
    );
  };

  const handleSerialSubmit = () => {
    if (selectedSerials.length === 0) return;
    addToCartLogic(currentSerializedProduct, selectedSerials.length, selectedSerials);
    setIsSerialModalOpen(false);
    setCurrentSerializedProduct(null);
    setSelectedSerials([]);
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
    setCartItems(prevCart => prevCart.filter(item => 
      !(item.type === 'service' && item._id === serviceId)
    ));
  };


  const updateQuantity = (product, amount) => {
    if (product.isSerialized) return;

    setCartItems(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.type === 'product' && item._id === product._id);
      if (existingItemIndex === -1) return prevCart;

      const existingItem = prevCart[existingItemIndex];
      const newQuantity = existingItem.cartQuantity + amount;

      const productInList = products.find(p => p._id === product._id);
      const currentAvailableInList = productInList ? productInList.quantity : 0;

      if (newQuantity <= 0) {
        setProducts(prevProducts =>
          prevProducts.map(p =>
            p._id === product._id ? { ...p, quantity: p.quantity + existingItem.cartQuantity } : p
          )
        );
        const newCart = [...prevCart];
        newCart.splice(existingItemIndex, 1);
        return newCart;
      }
      
      if (newQuantity <= existingItem.stock && (amount > 0 ? currentAvailableInList > 0 : true)) {
         setProducts(prevProducts =>
           prevProducts.map(p =>
             p._id === product._id ? { ...p, quantity: p.quantity - amount } : p
           )
         );
        const newCart = [...prevCart];
        newCart[existingItemIndex] = { ...existingItem, cartQuantity: newQuantity };
        return newCart;
      }
      
      return prevCart;
    });
  };

  const removeSerializedItem = (product) => {
     setProducts(prevProducts =>
          prevProducts.map(p =>
            p._id === product._id ? { ...p, quantity: p.quantity + product.cartQuantity } : p
          )
     );
     setCartItems(prevCart => prevCart.filter(item => item._id !== product._id));
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

  const handleClearCart = async () => {
    if (cartItems.length === 0) return;

    const isConfirmed = await confirm("Are you sure you want to clear the entire cart? This action cannot be undone.");
    
    if (isConfirmed) {
      setProducts(prevProducts => {
        const productsToRestore = cartItems.filter(item => item.type === 'product');
        if (productsToRestore.length === 0) return prevProducts;

        return prevProducts.map(p => {
          const itemInCart = productsToRestore.find(item => item._id === p._id);
          if (itemInCart) {
            return { ...p, quantity: itemInCart.stock }; 
          }
          return p;
        });
      });

      setCartItems([]);
      setSelectedCustomer(null);
      setSelectedMotorcycle(null);
      setCustomerMotorcycles([]);
      
      localStorage.removeItem('salesCart');
    }
  };

  const handleCompleteSale = async () => {
    if (cartItems.length === 0) return;

    const isConfirmed = await confirm(`Complete sale for a total of ₱${calculateTotal.toFixed(2)}? This action cannot be undone.`);

    if (isConfirmed) {
      const saleData = {
        items: cartItems.filter(item => item.type === 'product').map(item => ({ 
            product: item._id, 
            quantity: item.cartQuantity, 
            priceAtTime: item.price,
            serialNumbers: item.serialNumbers || []
        })),
        services: cartItems.filter(item => item.type === 'service').map(item => ({ service: item._id, priceAtTime: item.charge })),
        recordedBy: user._id, customerId: selectedCustomer ? selectedCustomer._id : undefined, motorcycleId: selectedMotorcycle ? selectedMotorcycle._id : undefined,
      };
      
      try {
        const response = await api.post('/sales', saleData);
        setLastSaleData(response.data);
        setShowReceiptModal(true);
        setCartItems([]);
        localStorage.removeItem('salesCart');
        setSelectedCustomer(null); 
        setSelectedMotorcycle(null);
        setCustomerMotorcycles([]);
        
        const productsResponse = await api.get('/products');
        setProducts(productsResponse.data.filter(p => p.status === 'active'));

      } catch (error) {
        alert(`Sale failed: ${error.response?.data?.message || error.message}`);
        const productsResponse = await api.get('/products');
        setProducts(productsResponse.data.filter(p => p.status === 'active'));
      }
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
        if (product.status !== 'active') return false; 
        
        const searchMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
        const brandMatch = selectedBrand ? product.brand._id === selectedBrand : true;
        const categoryMatch = selectedCategory ? product.category._id === selectedCategory : true;
        return searchMatch && brandMatch && categoryMatch;
    });
  }, [products, searchTerm, selectedBrand, selectedCategory]);

  const activeToggleButtonSx = {
    '&.Mui-selected, &.Mui-selected:hover': {
      color: 'white',
      backgroundColor: 'primary.main',
    }
  };

  const handleFilterChange = (setter) => (event, newValue) => { setter(newValue); };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <LoadingSpinner text="Loading Sales Terminal..." />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      gap: 2, 
      height: 'calc(100vh - 112px)', 
    }}>
      {/* Left Column: Product Grid */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Paper 
          sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}
          component={motion.div}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <TextField
            fullWidth label="Search Products" variant="outlined" size="small" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>), }} sx={{ mb: 1 }}
          />
          <Box sx={{ mb: 1 }}>
            <ToggleButtonGroup value={selectedCategory} exclusive onChange={handleFilterChange(setSelectedCategory)} size="small" fullWidth sx={{ display: 'flex' }}>
              <ToggleButton value={null} sx={{ flex: 1, ...activeToggleButtonSx }}>All</ToggleButton>
              {categories.map(cat => (
                <ToggleButton key={cat._id} value={cat._id} sx={{ flex: 1, ...activeToggleButtonSx }}>{cat.name}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ mb: 2 }}>
            <ToggleButtonGroup value={selectedBrand} exclusive onChange={handleFilterChange(setSelectedBrand)} size="small" fullWidth sx={{ display: 'flex' }}>
                <ToggleButton value={null} sx={{ flex: 1, ...activeToggleButtonSx }}>All</ToggleButton>
                {brands.map(brand => (
                  <ToggleButton key={brand._id} value={brand._id} sx={{ flex: 1, ...activeToggleButtonSx }}>{brand.name}</ToggleButton>
                ))}
            </ToggleButtonGroup>
          </Box>
          
          <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
            <Grid 
              container 
              spacing={2}
              component={motion.div}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              key={searchTerm + "-" + selectedCategory + "-" + selectedBrand}
            >
              <AnimatePresence mode="popLayout">
                {filteredProducts.map(product => (
                  <Grid 
                    item 
                    key={product._id} 
                    size={{ xs: 12, sm: 4, md: 3, lg: 2 }}
                    component={motion.div}
                    variants={itemVariants}
                    layout 
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  > 
                    <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%', ...(product.quantity === 0 && { backgroundColor: grey[300], cursor: 'not-allowed' }) }}>
                      <CardActionArea 
                        onClick={() => addProductToCart(product)} disabled={product.quantity === 0}
                        sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1}} 
                      >
                        <CardMedia component="img" height="120" image={product.image || 'https://placehold.co/300x200'} alt={product.name}
                          sx={{ objectFit: 'contain', p: 1, ...(product.quantity === 0 && { filter: 'grayscale(100%)' }) }}
                        />
                        {product.quantity === 0 && (<Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '120px', backgroundColor: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Typography variant="button" color="error" sx={{ fontWeight: 'bold'}}>Out of Stock</Typography></Box>)}
                        <CardContent sx={{ p: 1, flexGrow: 1, width: '100%' }}><Typography gutterBottom variant="body2" component="div" sx={{ fontWeight: 'bold', minHeight: '40px' }}>{product.name}</Typography><Typography variant="body2" color="text.secondary">Stock: {product.quantity}</Typography></CardContent>
                        <Box sx={{ p: 1, pt: 0, width: '100%', mt: 'auto' }}><Typography variant="h6" color="primary.main">₱{product.price.toFixed(2)}</Typography></Box>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </AnimatePresence>
            </Grid>
          </Box>
        </Paper>
      </Box>

      {/* Right Column: Cart */}
      <Box sx={{ width: '380px', height: '100%', position: 'sticky', top: '88px' }}>
        <Paper 
          sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}
          component={motion.div}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}><FaUserTag style={{ marginRight: '8px' }} /> Customer Details</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Autocomplete sx={{ flexGrow: 1 }} options={customers} getOptionLabel={(option) => option.name} value={selectedCustomer}
                onChange={(event, newValue) => { setSelectedCustomer(newValue); }}
                isOptionEqualToValue={(option, value) => option?._id === value?._id}
                renderInput={(params) => <TextField {...params} label="Select a Customer (Optional)" size="small" />}
              />
              <Button variant="outlined" size="small" onClick={() => setIsCustomerModalOpen(true)}>New</Button>
            </Stack>
            
            <AnimatePresence>
              {selectedCustomer && (
                <Box
                  component={motion.div}
                  variants={expandVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  sx={{ mt: 1, pt: 1, pb: 1, overflow: 'hidden' }} 
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Autocomplete sx={{ flexGrow: 1 }} options={customerMotorcycles} loading={isFetchingMotorcycles} getOptionLabel={(option) => `${option.make} ${option.model} (${option.plateNumber || 'No Plate'})`}
                      value={selectedMotorcycle} onChange={(event, newValue) => { setSelectedMotorcycle(newValue); }} isOptionEqualToValue={(option, value) => option?._id === value?._id}
                      renderInput={(params) => (<TextField {...params} label="Select Motorcycle (Optional)" size="small" InputProps={{ ...params.InputProps, endAdornment: (<>{isFetchingMotorcycles ? <CircularProgress color="inherit" size={20} /> : null}{params.InputProps.endAdornment}</>),}}/>)}
                    />
                    <Button variant="outlined" size="small" onClick={() => setIsMotorcycleModalOpen(true)}>New</Button>
                  </Stack>
                </Box>
              )}
            </AnimatePresence>

          </Box>
          <Divider sx={{ mb: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <ShoppingCartIcon sx={{ mr: 1 }}/> Current Sale
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Clear Cart">
                <span><IconButton color="error" onClick={handleClearCart} disabled={cartItems.length === 0}><DeleteSweepIcon /></IconButton></span>
              </Tooltip>
              <Tooltip title="Add Service">
                <IconButton color="primary" onClick={() => setIsServiceModalOpen(true)}><DesignServicesIcon /></IconButton>
              </Tooltip>
            </Stack>
          </Box>
          <Divider sx={{ mb: 1 }} />
          <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden' }}> {/* overflowX hidden prevents scrollbar during slide-in */}
            {cartItems.length === 0 ? (<Typography color="text.secondary" align="center" sx={{ mt: 4 }}>Cart is empty</Typography>) : (
              <List>
                <AnimatePresence mode='popLayout' initial={false}>
                  {cartItems.map(item => (
                    <ListItem 
                      key={item._id} // Using product _id as key
                      disablePadding
                      component={motion.li}
                      layout // Smooths layout changes when other items are removed
                      variants={cartItemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      {/* --- NEW: Cart Item Images & Icons --- */}
                      <ListItemAvatar>
                        <Avatar 
                          variant={item.type === 'product' ? "rounded" : "circular"}
                          src={item.type === 'product' ? (item.image || 'https://placehold.co/50') : undefined}
                          alt={item.name}
                          sx={{ 
                            bgcolor: item.type === 'service' ? 'action.selected' : 'grey.200',
                            color: 'primary.main',
                            width: 48, height: 48, mr: 1.5
                          }}
                        >
                          {item.type === 'service' && <BuildIcon fontSize="small" />}
                          {item.type === 'product' && !item.image && <InventoryIcon fontSize="small" color="action" />}
                        </Avatar>
                      </ListItemAvatar>
                      {/* --- END NEW --- */}

                      {item.type === 'product' ? (
                          <>
                              <ListItemText 
                                  primary={
                                      <React.Fragment>
                                          {item.name}
                                          {item.serialNumbers && item.serialNumbers.length > 0 && (
                                              <Typography variant="caption" display="block" color="text.secondary">
                                                  SNs: {item.serialNumbers.join(', ')}
                                              </Typography>
                                          )}
                                      </React.Fragment>
                                  } 
                                  secondary={`₱${(item.price * item.cartQuantity).toFixed(2)}`}
                              />
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  {item.isSerialized ? (
                                      <IconButton size="small" edge="end" aria-label="delete" onClick={() => removeSerializedItem(item)}>
                                          <DeleteIcon fontSize="small" />
                                      </IconButton>
                                  ) : (
                                      <>
                                          <IconButton size="small" onClick={() => updateQuantity(item, -1)}><RemoveIcon fontSize="small"/></IconButton>
                                          <Typography sx={{ mx: 1 }}>{item.cartQuantity}</Typography>
                                          <IconButton size="small" onClick={() => updateQuantity(item, 1)} disabled={item.cartQuantity >= item.stock}><AddIcon fontSize="small"/></IconButton>
                                      </>
                                  )}
                              </Box>
                          </>
                      ) : (
                          <>
                              <ListItemText primary={item.name} secondary={`₱${(item.charge).toFixed(2)}`}/>
                              <Tooltip title="Remove Service"><IconButton size="small" edge="end" aria-label="delete" onClick={() => removeServiceFromCart(item._id)}><DeleteIcon /></IconButton></Tooltip>
                          </>
                      )}
                    </ListItem>
                  ))}
                </AnimatePresence>
              </List>
            )}
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ mt: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Total</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>₱{calculateTotal.toFixed(2)}</Typography>
            </Box>
            <Button variant="contained" color="success" fullWidth size="large" startIcon={<PointOfSaleIcon />} onClick={handleCompleteSale} disabled={cartItems.length === 0}>
                Complete Sale
            </Button>
          </Box>
        </Paper>
      </Box>

      <Dialog open={isSerialModalOpen} onClose={() => setIsSerialModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Select Specific Items: {currentSerializedProduct?.name}</DialogTitle>
          <DialogContent>
              {currentSerializedProduct?.serializedItems && currentSerializedProduct.serializedItems.filter(s => s.status === 'Available').length > 0 ? (
                  <Grid container spacing={1}>
                    {currentSerializedProduct.serializedItems
                        .filter(s => s.status === 'Available')
                        .filter(s => {
                             const inCart = cartItems.find(c => c._id === currentSerializedProduct._id);
                             return !inCart || !inCart.serialNumbers.includes(s.serialNumber);
                        })
                        .map((serial, index) => (
                        <Grid item size={{ xs: 12, sm: 6 }} key={index}>
                           <FormControlLabel
                              control={
                                <Checkbox 
                                    checked={selectedSerials.includes(serial.serialNumber)}
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedSerials([...selectedSerials, serial.serialNumber]);
                                        else setSelectedSerials(selectedSerials.filter(sn => sn !== serial.serialNumber));
                                    }}
                                />
                              }
                              label={serial.serialNumber}
                           />
                        </Grid>
                    ))}
                  </Grid>
              ) : (
                  <Typography color="error">No available serial numbers found for this product.</Typography>
              )}
          </DialogContent>
          <DialogActions>
              <Button onClick={() => setIsSerialModalOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleSerialSubmit} disabled={selectedSerials.length === 0}>Confirm Selection ({selectedSerials.length})</Button>
          </DialogActions>
      </Dialog>

      {selectedCustomer && (
        <Dialog open={isMotorcycleModalOpen} onClose={() => setIsMotorcycleModalOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Add New Motorcycle for {selectedCustomer.name}</DialogTitle>
            <MotorcycleForm customer={selectedCustomer} onFormSubmit={handleNewMotorcycleSubmit} onClose={() => setIsMotorcycleModalOpen(false)}/>
        </Dialog>
      )}
      <Dialog open={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Customer</DialogTitle>
          <CustomerForm onClose={() => setIsCustomerModalOpen(false)} onFormSubmit={handleNewCustomerSubmit}/>
      </Dialog>
      {lastSaleData && <ReceiptModal open={showReceiptModal} saleData={lastSaleData} onClose={() => setShowReceiptModal(false)} />}
      <AddServiceModal open={isServiceModalOpen} onClose={() => setIsServiceModalOpen(false)} services={services} onAddService={addServiceToCart} cartItems={cartItems}/>
    </Box>
  );
};

export default SalesPage;