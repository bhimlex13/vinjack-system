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
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

// MUI Imports
import {
  Box, Grid, Paper, TextField, InputAdornment, Typography, Card, CardActionArea,
  CardMedia, CardContent, ToggleButtonGroup, ToggleButton, List, ListItem,
  ListItemText, IconButton, Divider, Button, Tooltip, Autocomplete, Stack,
  Dialog, DialogTitle, CircularProgress, Checkbox, DialogContent, DialogActions, FormControlLabel,
  ListItemAvatar, Avatar, useTheme, useMediaQuery, Container, Drawer, Fab, Badge, Chip
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
import BuildIcon from '@mui/icons-material/Build';
import InventoryIcon from '@mui/icons-material/Inventory';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { FaUserTag } from 'react-icons/fa';

import LoadingSpinner from '../components/LoadingSpinner';

// --- INITIAL STATE ---
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
  // --- STATE ---
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
  const [selectedBrand, setSelectedBrand] = useState('all'); 
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { user } = useContext(AuthContext);
  const { confirm } = useContext(ConfirmationContext);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastSaleData, setLastSaleData] = useState(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

  const [isSerialModalOpen, setIsSerialModalOpen] = useState(false);
  const [currentSerializedProduct, setCurrentSerializedProduct] = useState(null);
  const [selectedSerials, setSelectedSerials] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);

  // Mobile Cart State
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Theme & Responsive
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // --- VARIANTS ---
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0, scale: 0.95 },
    visible: { y: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 100, damping: 12 } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
  };

  const cartItemVariants = {
    hidden: { opacity: 0, x: 20, scale: 0.9 },
    visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
  };

  const expandVariants = {
    hidden: { opacity: 0, height: 0, overflow: 'hidden' },
    visible: { opacity: 1, height: 'auto', transition: { duration: 0.3 } },
    exit: { opacity: 0, height: 0 }
  };

  // --- SOCKET IO & EFFECTS ---
  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL);
    socket.on('customer_added', (newCustomer) => {
      setCustomers(prev => prev.some(c => c._id === newCustomer._id) ? prev : [...prev, newCustomer]);
    });
    socket.on('motorcycle_added', (newMotorcycle) => {
      if (selectedCustomer && selectedCustomer._id === newMotorcycle.owner) {
        fetchMotorcycles(selectedCustomer._id);
      }
    });
    return () => socket.disconnect();
  }, [selectedCustomer]);

  useEffect(() => {
    localStorage.setItem('salesCart', JSON.stringify({ items: cartItems, customer: selectedCustomer, motorcycle: selectedMotorcycle }));
  }, [cartItems, selectedCustomer, selectedMotorcycle]);

  const fetchMotorcycles = async (customerId) => {
    setIsFetchingMotorcycles(true);
    try {
      const data = await getMotorcyclesByCustomer(customerId);
      setCustomerMotorcycles(data);
    } catch (err) {
      console.error("Failed to fetch motorcycles", err);
      setCustomerMotorcycles([]);
    } finally {
      setIsFetchingMotorcycles(false);
    }
  };

  useEffect(() => {
    if (selectedCustomer) fetchMotorcycles(selectedCustomer._id);
    else {
      setCustomerMotorcycles([]);
      setSelectedMotorcycle(null);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [productsRes, categoriesRes, brandsRes, servicesRes, customersRes] = await Promise.all([
          api.get('/products'), api.get('/categories'), api.get('/brands'),
          getServices('active'), getCustomers(),
        ]);
        
        let activeProductsData = productsRes.data.filter(p => p.status === 'active');

        // Adjust stock based on cart
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

  // --- HANDLERS ---
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
        const updatedSerials = existingItem.serialNumbers ? [...existingItem.serialNumbers, ...serials] : serials;
        if (existingItem.cartQuantity + qty <= existingItem.stock) { 
          return prevCart.map(item => item._id === product._id ? { ...item, cartQuantity: item.cartQuantity + qty, serialNumbers: updatedSerials } : item);
        }
        return prevCart; 
      } else {
        return [...prevCart, { ...product, cartQuantity: qty, stock: product.quantity, type: 'product', serialNumbers: serials }];
      }
    });
    setProducts(prevProducts => prevProducts.map(p => p._id === product._id ? { ...p, quantity: p.quantity - qty } : p));
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
      if (existingItem) return prevCart;
      return [...prevCart, { ...service, type: 'service' }];
    });
    setIsServiceModalOpen(false);
  };

  const removeServiceFromCart = (serviceId) => {
    setCartItems(prevCart => prevCart.filter(item => !(item.type === 'service' && item._id === serviceId)));
  };

  const updateQuantity = (product, amount) => {
    if (product.isSerialized) return;
    setCartItems(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.type === 'product' && item._id === product._id);
      if (existingItemIndex === -1) return prevCart;

      const existingItem = prevCart[existingItemIndex];
      const newQuantity = existingItem.cartQuantity + amount;

      if (newQuantity <= 0) {
        setProducts(prevProducts => prevProducts.map(p => p._id === product._id ? { ...p, quantity: p.quantity + existingItem.cartQuantity } : p));
        const newCart = [...prevCart];
        newCart.splice(existingItemIndex, 1);
        return newCart;
      }
      
      if (newQuantity <= existingItem.stock) {
         setProducts(prevProducts => prevProducts.map(p => p._id === product._id ? { ...p, quantity: p.quantity - amount } : p));
        const newCart = [...prevCart];
        newCart[existingItemIndex] = { ...existingItem, cartQuantity: newQuantity };
        return newCart;
      }
      return prevCart;
    });
  };

  const removeSerializedItem = (product) => {
     setProducts(prevProducts => prevProducts.map(p => p._id === product._id ? { ...p, quantity: p.quantity + product.cartQuantity } : p));
     setCartItems(prevCart => prevCart.filter(item => item._id !== product._id));
  };

  const calculateTotal = useMemo(() => {
    return cartItems.reduce((total, item) => {
      if (item.type === 'product') return total + item.price * item.cartQuantity;
      if (item.type === 'service') return total + item.charge;
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
          if (itemInCart) return { ...p, quantity: itemInCart.stock }; 
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
        const brandMatch = selectedBrand !== 'all' ? product.brand._id === selectedBrand : true;
        const categoryMatch = selectedCategory !== 'all' ? product.category._id === selectedCategory : true;
        return searchMatch && brandMatch && categoryMatch;
    });
  }, [products, searchTerm, selectedBrand, selectedCategory]);

  const toggleButtonSx = {
    border: 'none',
    borderRadius: '20px !important',
    margin: '4px !important',
    px: 2,
    py: 0.5,
    fontSize: '0.8rem',
    fontWeight: 600,
    textTransform: 'none',
    color: 'text.secondary',
    backgroundColor: 'action.hover',
    whiteSpace: 'nowrap', // Prevent text wrapping in toggle buttons
    '&.Mui-selected, &.Mui-selected:hover': {
      color: 'white',
      backgroundColor: 'primary.main',
      boxShadow: 2
    }
  };

  // --- CART CONTENT COMPONENT (REUSABLE) ---
  const CartContent = ({ onCloseMobile }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header for Mobile Drawer */}
      {isMobile && (
        <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            p: 2,
            borderBottom: '1px solid', 
            borderColor: 'divider',
            bgcolor: 'background.paper',
            position: 'sticky',
            top: 0,
            zIndex: 10
        }}>
          <Stack direction="row" alignItems="center" spacing={1}>
             <IconButton onClick={onCloseMobile} size="small"><ArrowBackIcon /></IconButton>
             <Typography variant="h6" fontWeight={800} color="primary">Cart</Typography>
          </Stack>
          <IconButton onClick={onCloseMobile} size="medium" sx={{ bgcolor: 'action.hover' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      )}

      <Box sx={{ p: isMobile ? 2 : 0, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Customer Section - Wrapped in LayoutGroup to prevent layout thrashing */}
        <LayoutGroup>
            <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                <FaUserTag style={{ marginRight: '8px' }} /> Customer Info
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                <Autocomplete 
                    sx={{ flexGrow: 1 }} 
                    options={customers} 
                    getOptionLabel={(option) => option.name} 
                    value={selectedCustomer}
                    onChange={(event, newValue) => { setSelectedCustomer(newValue); }}
                    isOptionEqualToValue={(option, value) => option?._id === value?._id}
                    renderInput={(params) => <TextField {...params} placeholder="Select Customer" size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />}
                />
                <Button variant="soft" color="primary" size="medium" onClick={() => setIsCustomerModalOpen(true)} sx={{ minWidth: 'auto', px: 2, borderRadius: 2 }}>New</Button>
                </Stack>
                
                <AnimatePresence>
                {selectedCustomer && (
                    <motion.div variants={expandVariants} initial="hidden" animate="visible" exit="exit" layout>
                    <Box sx={{ mt: 1.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                        <Autocomplete 
                            sx={{ flexGrow: 1 }} 
                            options={customerMotorcycles} 
                            loading={isFetchingMotorcycles} 
                            getOptionLabel={(option) => `${option.make} ${option.model} (${option.plateNumber || 'No Plate'})`}
                            value={selectedMotorcycle} 
                            onChange={(event, newValue) => { setSelectedMotorcycle(newValue); }} 
                            isOptionEqualToValue={(option, value) => option?._id === value?._id}
                            renderInput={(params) => (
                            <TextField 
                                {...params} 
                                placeholder="Select Motorcycle (Optional)" 
                                size="small" 
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                InputProps={{ ...params.InputProps, endAdornment: (<>{isFetchingMotorcycles ? <CircularProgress color="inherit" size={20} /> : null}{params.InputProps.endAdornment}</>) }}
                            />
                            )}
                        />
                        <Button variant="soft" color="secondary" size="medium" onClick={() => setIsMotorcycleModalOpen(true)} sx={{ minWidth: 'auto', px: 2, borderRadius: 2 }}>New</Button>
                        </Stack>
                    </Box>
                    </motion.div>
                )}
                </AnimatePresence>
            </Box>
        </LayoutGroup>

        <Divider sx={{ mb: 2 }} />

        {/* Cart Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', fontWeight: 800 }}>
            <ShoppingCartIcon sx={{ mr: 1, color: 'primary.main' }}/> Order Items
            </Typography>
            <Stack direction="row" spacing={1}>
            <Tooltip title="Add Service">
                <IconButton size="small" sx={{ bgcolor: 'info.light', color: 'info.dark', borderRadius: 2 }} onClick={() => setIsServiceModalOpen(true)}>
                <DesignServicesIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <Tooltip title="Clear Cart">
                <IconButton size="small" sx={{ bgcolor: 'error.light', color: 'error.dark', borderRadius: 2 }} onClick={handleClearCart} disabled={cartItems.length === 0}>
                <DeleteSweepIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            </Stack>
        </Box>
        
        {/* Cart List */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: '200px', pr: 1 }}>
            {cartItems.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                <ShoppingCartIcon sx={{ fontSize: 60, mb: 1, color: 'text.disabled' }} />
                <Typography variant="body2" color="text.secondary">Cart is empty</Typography>
            </Box>
            ) : (
            <List disablePadding>
                <AnimatePresence mode='popLayout' initial={false}>
                {cartItems.map(item => (
                    <ListItem 
                    key={item._id}
                    disablePadding
                    component={motion.li}
                    layout // Enable Layout animation for smoother reordering/entry
                    variants={cartItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    sx={{ 
                        mb: 1.5, 
                        border: '1px solid', 
                        borderColor: 'divider', 
                        borderRadius: 3, 
                        p: 1,
                        bgcolor: 'background.paper'
                    }}
                    >
                    <ListItemAvatar>
                        <Avatar 
                        variant={item.type === 'product' ? "rounded" : "circular"}
                        src={item.type === 'product' ? (item.image) : undefined}
                        alt={item.name}
                        sx={{ 
                            bgcolor: item.type === 'service' ? 'info.light' : 'grey.100',
                            color: item.type === 'service' ? 'info.dark' : 'grey.600',
                            width: 50, height: 50, mr: 1.5, borderRadius: 2
                        }}
                        >
                        {item.type === 'service' ? <BuildIcon fontSize="small" /> : <InventoryIcon fontSize="small" />}
                        </Avatar>
                    </ListItemAvatar>

                    <ListItemText 
                        primary={
                        <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                            {item.name}
                            {item.serialNumbers && item.serialNumbers.length > 0 && (
                            <Typography component="span" variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                SN: {item.serialNumbers.join(', ')}
                            </Typography>
                            )}
                        </Typography>
                        } 
                        secondary={
                        <Typography variant="body2" color="primary.main" fontWeight="bold">
                            ₱{item.type === 'product' ? (item.price * item.cartQuantity).toFixed(2) : item.charge.toFixed(2)}
                        </Typography>
                        }
                    />

                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {item.type === 'product' && !item.isSerialized ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 50 }}>
                            <IconButton size="small" onClick={() => updateQuantity(item, -1)} sx={{ p: 0.5 }}>
                            <RemoveIcon fontSize="small" />
                            </IconButton>
                            {/* Key on quantity forces animate update */}
                            <motion.div key={item.cartQuantity} initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                                <Typography sx={{ mx: 1, fontWeight: 'bold', minWidth: '16px', textAlign: 'center', fontSize: '0.9rem' }}>{item.cartQuantity}</Typography>
                            </motion.div>
                            <IconButton size="small" onClick={() => updateQuantity(item, 1)} disabled={item.cartQuantity >= item.stock} sx={{ p: 0.5 }}>
                            <AddIcon fontSize="small" />
                            </IconButton>
                        </Box>
                        ) : (
                        <IconButton size="small" color="error" onClick={() => item.type === 'product' ? removeSerializedItem(item) : removeServiceFromCart(item._id)}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                        )}
                    </Box>
                    </ListItem>
                ))}
                </AnimatePresence>
            </List>
            )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Totals & Checkout */}
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, px: 1 }}>
                <Typography variant="h6" color="text.secondary" fontWeight={600}>Total</Typography>
                <Typography variant="h4" color="primary.main" fontWeight={800}>₱{calculateTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
            </Box>
            <Button 
                variant="contained" 
                color="success" 
                fullWidth 
                size="large" 
                startIcon={<PointOfSaleIcon />} 
                onClick={handleCompleteSale} 
                disabled={cartItems.length === 0}
                sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 'bold', boxShadow: 4, borderRadius: 3 }}
            >
                Complete Sale
            </Button>
        </Box>
      </Box>
    </Box>
  );

  if (isLoading) {
    return <LoadingSpinner text="Loading Sales Terminal..." />;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, height: isMobile ? 'auto' : 'calc(100vh - 120px)' }}>
      {/* Grid Container using Standard SIZE prop syntax (v6 compatible) */}
      <Grid container spacing={3} sx={{ height: '100%' }}>
        
        {/* --- LEFT COLUMN: PRODUCTS --- */}
        <Grid size={{ xs: 12, md: 8 }} sx={{ height: isMobile ? 'auto' : '100%', display: 'flex', flexDirection: 'column' }}>
          <Paper 
            sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 3, boxShadow: 3 }}
            component={motion.div}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Header & Search */}
            <Box sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>Product Catalog</Typography>
                <TextField
                fullWidth 
                placeholder="Search by product name..." 
                variant="outlined" 
                size="small" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{ 
                    startAdornment: (<InputAdornment position="start"><SearchIcon color="action"/></InputAdornment>), 
                    sx: { borderRadius: 3, backgroundColor: 'background.default' }
                }} 
                />
            </Box>

            {/* --- RESPONSIVE FILTERS WITH HORIZONTAL SCROLLING --- */}
            <Box sx={{ mb: 2 }}>
                {/* Unified Filter Layout for Mobile AND Desktop */}
                <>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ ml: 1 }}>CATEGORIES</Typography>
                  <Box sx={{ 
                      display: 'flex', 
                      flexWrap: 'nowrap', // Prevent wrapping
                      overflowX: 'auto',  // Enable horizontal scroll
                      gap: 0.5, 
                      mb: 1.5, 
                      pb: 1, // Padding for scrollbar
                      '::-webkit-scrollbar': { height: '4px' },
                      '::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px' }
                  }}>
                      <ToggleButtonGroup value={selectedCategory} exclusive onChange={(e, val) => val && setSelectedCategory(val)} size="small">
                        <ToggleButton value="all" sx={toggleButtonSx}>All</ToggleButton>
                        {categories.map(cat => (
                            <ToggleButton key={cat._id} value={cat._id} sx={toggleButtonSx}>{cat.name}</ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                  </Box>

                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ ml: 1 }}>BRANDS</Typography>
                  <Box sx={{ 
                      display: 'flex', 
                      flexWrap: 'nowrap', 
                      overflowX: 'auto', 
                      gap: 0.5,
                      pb: 1,
                      '::-webkit-scrollbar': { height: '4px' },
                      '::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px' }
                  }}>
                      <ToggleButtonGroup value={selectedBrand} exclusive onChange={(e, val) => val && setSelectedBrand(val)} size="small">
                          <ToggleButton value="all" sx={toggleButtonSx}>All</ToggleButton>
                          {brands.map(brand => (
                            <ToggleButton key={brand._id} value={brand._id} sx={toggleButtonSx}>{brand.name}</ToggleButton>
                          ))}
                      </ToggleButtonGroup>
                  </Box>
                </>
            </Box>
            
            <Divider sx={{ mb: 2 }} />

            {/* Product Grid */}
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
                    // Using SIZE prop syntax
                    <Grid 
                      item // Optional in v2/v6 but safe to keep for compatibility if types are loose
                      key={product._id} 
                      size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                      component={motion.div}
                      variants={itemVariants}
                      layout 
                    > 
                      <Card 
                        component={motion.div}
                        whileHover={{ y: -5, boxShadow: theme.shadows[8] }}
                        sx={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          height: '100%', 
                          borderRadius: 3,
                          border: '1px solid',
                          borderColor: 'divider',
                          ...(product.quantity === 0 && { backgroundColor: grey[100], cursor: 'not-allowed', opacity: 0.8 }) 
                        }}
                      >
                        <CardActionArea 
                          onClick={() => addProductToCart(product)} 
                          disabled={product.quantity === 0}
                          sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, alignItems: 'stretch' }} 
                        >
                          <Box sx={{ position: 'relative', pt: 2, px: 2, display: 'flex', justifyContent: 'center' }}>
                            <CardMedia 
                              component="img" 
                              height="120" 
                              image={product.image || 'https://placehold.co/300x200?text=No+Image'} 
                              alt={product.name}
                              sx={{ objectFit: 'contain', width: 'auto', maxWidth: '100%' }}
                            />
                            {product.quantity === 0 && (
                              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.7)' }}>
                                <Typography variant="button" color="error" sx={{ fontWeight: 900, transform: 'rotate(-15deg)', border: '2px solid red', px: 1, borderRadius: 1 }}>OUT OF STOCK</Typography>
                              </Box>
                            )}
                          </Box>
                          
                          <CardContent sx={{ p: 1.5, flexGrow: 1 }}>
                            <Tooltip title={product.name}>
                                <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.3, mb: 0.5, height: '2.6em', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {product.name}
                                </Typography>
                            </Tooltip>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                Stock: {product.quantity}
                                </Typography>
                                <Chip label={product.brand?.name} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                            </Stack>
                          </CardContent>
                          
                          <Box sx={{ p: 1.5, pt: 0, mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="subtitle1" color="primary.main" fontWeight={800}>
                              ₱{product.price.toFixed(2)}
                            </Typography>
                            <IconButton size="small" color="primary" sx={{ bgcolor: 'primary.50', '&:hover': { bgcolor: 'primary.100' } }}>
                              <AddIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </AnimatePresence>
              </Grid>
            </Box>
          </Paper>
        </Grid>

        {/* --- RIGHT COLUMN: CART (Desktop Only) --- */}
        {!isMobile && (
          <Grid size={{ xs: 12, md: 4 }} sx={{ height: '100%' }}>
            <Paper 
              sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 3, boxShadow: 3, borderTop: `4px solid ${theme.palette.primary.main}` }}
              component={motion.div}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <CartContent />
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* --- MOBILE: FLOATING ACTION BUTTON & DRAWER --- */}
      {isMobile && (
        <>
          <Fab 
            color="primary" 
            aria-label="cart"
            onClick={() => setIsMobileCartOpen(true)}
            sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1200 }}
          >
            <Badge badgeContent={cartItems.reduce((acc, item) => acc + (item.type === 'product' ? item.cartQuantity : 1), 0)} color="error">
              <ShoppingCartIcon />
            </Badge>
          </Fab>

          <Drawer
            anchor="right"
            open={isMobileCartOpen}
            onClose={() => setIsMobileCartOpen(false)}
            PaperProps={{ sx: { width: '100%', maxWidth: '100%' } }} // Full width on mobile
          >
            <CartContent onCloseMobile={() => setIsMobileCartOpen(false)} />
          </Drawer>
        </>
      )}

      {/* --- MODALS --- */}
      <Dialog open={isSerialModalOpen} onClose={() => setIsSerialModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Select Serials: {currentSerializedProduct?.name}</DialogTitle>
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
                  <Typography color="error">No available serial numbers found.</Typography>
              )}
          </DialogContent>
          <DialogActions>
              <Button onClick={() => setIsSerialModalOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleSerialSubmit} disabled={selectedSerials.length === 0}>Confirm ({selectedSerials.length})</Button>
          </DialogActions>
      </Dialog>

      {selectedCustomer && (
        <Dialog open={isMotorcycleModalOpen} onClose={() => setIsMotorcycleModalOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Add Motorcycle for {selectedCustomer.name}</DialogTitle>
            <MotorcycleForm customer={selectedCustomer} onFormSubmit={handleNewMotorcycleSubmit} onClose={() => setIsMotorcycleModalOpen(false)}/>
        </Dialog>
      )}
      <Dialog open={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Customer</DialogTitle>
          <CustomerForm onClose={() => setIsCustomerModalOpen(false)} onFormSubmit={handleNewCustomerSubmit}/>
      </Dialog>
      {lastSaleData && <ReceiptModal open={showReceiptModal} saleData={lastSaleData} onClose={() => setShowReceiptModal(false)} />}
      <AddServiceModal open={isServiceModalOpen} onClose={() => setIsServiceModalOpen(false)} services={services} onAddService={addServiceToCart} cartItems={cartItems}/>
    </Container>
  );
};

export default SalesPage;