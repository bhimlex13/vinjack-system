// client/src/pages/SalesPage.js
import React, { useState, useEffect, useContext, useMemo } from 'react';
import api from '../api/axios';
import AuthContext from '../context/AuthContext';
import ReceiptModal from '../components/ReceiptModal';
import ConfirmationContext from '../context/ConfirmationContext';

// MUI Imports
import {
  Box,
  Grid,
  Paper,
  TextField,
  InputAdornment,
  Typography,
  Card,
  CardActionArea,
  CardMedia,
  CardContent,
  ToggleButtonGroup,
  ToggleButton,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';


const SalesPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { user } = useContext(AuthContext);
  const { confirm } = useContext(ConfirmationContext);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastSaleData, setLastSaleData] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [productsRes, categoriesRes, brandsRes] = await Promise.all([
          api.get('/products'),
          api.get('/categories'),
          api.get('/brands'),
        ]);
        setProducts(productsRes.data);
        setCategories(categoriesRes.data);
        setBrands(brandsRes.data);
      } catch (error) {
        console.error("Failed to fetch initial data", error);
      }
    };
    fetchInitialData();
  }, []);

  const addProductToCart = (product) => {
    const productInState = products.find(p => p._id === product._id);
    if (!productInState || productInState.quantity <= 0) return;

    setCartItems(prevCart => {
      const existingItem = prevCart.find(item => item._id === product._id);
      if (existingItem) {
        if (existingItem.cartQuantity < existingItem.stock) {
          return prevCart.map(item =>
            item._id === product._id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item
          );
        }
        return prevCart;
      } else {
        return [...prevCart, { ...product, cartQuantity: 1, stock: product.quantity }];
      }
    });

    setProducts(prevProducts =>
      prevProducts.map(p =>
        p._id === product._id ? { ...p, quantity: p.quantity - 1 } : p
      )
    );
  };

  const updateQuantity = (product, amount) => {
    setCartItems(prevCart => {
      const existingItem = prevCart.find(item => item._id === product._id);
      if (!existingItem) return prevCart;

      const newQuantity = existingItem.cartQuantity + amount;

      if (newQuantity <= 0) {
        // Find the original stock from the cart item and add it back to the product list
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
    return cartItems.reduce((total, item) => total + item.price * item.cartQuantity, 0);
  }, [cartItems]);

  const handleCompleteSale = async () => {
    if (cartItems.length === 0) return;

    const isConfirmed = await confirm(`Complete sale for a total of ₱${calculateTotal.toFixed(2)}? This action cannot be undone.`);

    if (isConfirmed) {
      const saleData = {
        items: cartItems.map(item => ({
          product: item._id, quantity: item.cartQuantity, priceAtTime: item.price, costAtTime: item.cost
        })),
        totalAmount: calculateTotal,
        recordedBy: user._id,
      };
      
      try {
        const response = await api.post('/sales', saleData);
        setLastSaleData(response.data);
        setShowReceiptModal(true);
        setCartItems([]);
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
    // --- LAYOUT FIX #1: Main container uses flexbox to manage its children correctly ---
    <Box sx={{ display: 'flex', height: '100%', gap: 2 }}>
      
      {/* Left Column: Product Selection */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <TextField
            fullWidth
            label="Search Products"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>), }}
            sx={{ mb: 1 }}
          />
          <Box sx={{ mb: 1 }}>
            {/* --- BUTTONS FIX #1: Added sx prop to ToggleButtonGroup to make buttons equal width --- */}
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
                // --- CARD FIX #1: Make the Grid item a flex container ---
                <Grid item key={product._id} xs={6} sm={4} md={4} lg={3} sx={{ display: 'flex' }}>
                  {/* --- CARD FIX #2: Make the Card a flex column that fills the available height --- */}
                  <Card sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardActionArea 
                      onClick={() => addProductToCart(product)} 
                      disabled={product.quantity === 0}
                      // Make the clickable area also a flex column that grows
                      sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }} 
                    >
                      <CardMedia
                        component="img"
                        height="120"
                        image={product.image || 'https://placehold.co/300x200'}
                        alt={product.name}
                        sx={{ objectFit: 'contain', p: 1 }}
                      />
                      {product.quantity === 0 && (
                        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '120px', backgroundColor: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography variant="button" color="error" sx={{ fontWeight: 'bold' }}>Out of Stock</Typography>
                        </Box>
                      )}
                      {/* --- CARD FIX #3: Make the content area grow to push the price to the bottom --- */}
                      <CardContent sx={{ p: 1, flexGrow: 1, width: '100%' }}>
                        <Typography gutterBottom variant="body2" component="div" sx={{ fontWeight: 'bold', minHeight: '40px' }}>
                          {product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Stock: {product.quantity}
                        </Typography>
                      </CardContent>
                      {/* --- CARD FIX #4: Price is now at the bottom, ensuring alignment --- */}
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

      {/* --- LAYOUT FIX #2: The cart is now explicitly defined in the right column --- */}
      <Box sx={{ width: '380px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}><ShoppingCartIcon sx={{ mr: 1 }}/> Current Sale</Typography>
          <Divider sx={{ mb: 1 }} />
          <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
            {cartItems.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>Cart is empty</Typography>
            ) : (
              <List>
                {cartItems.map(item => (
                  <ListItem key={item._id} disablePadding secondaryAction={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <IconButton size="small" onClick={() => updateQuantity(item, -1)}><RemoveIcon fontSize="small"/></IconButton>
                      <Typography sx={{ mx: 1 }}>{item.cartQuantity}</Typography>
                      <IconButton size="small" onClick={() => updateQuantity(item, 1)} disabled={item.cartQuantity >= item.stock}><AddIcon fontSize="small"/></IconButton>
                    </Box>
                  }>
                    <ListItemText 
                      primary={item.name} 
                      secondary={`₱${(item.price * item.cartQuantity).toFixed(2)}`} 
                    />
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
              variant="contained" 
              color="success" 
              fullWidth 
              size="large"
              startIcon={<PointOfSaleIcon />}
              onClick={handleCompleteSale}
              disabled={cartItems.length === 0}
            >
              Complete Sale
            </Button>
          </Box>
        </Paper>
      </Box>

      {showReceiptModal && lastSaleData && (
        <ReceiptModal 
          saleData={lastSaleData}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </Box>
  );
};

export default SalesPage;