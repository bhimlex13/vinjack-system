// client/src/components/RecordDeliveryForm.js
import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import AuthContext from '../context/AuthContext';

// MUI Imports
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Alert,
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';

const RecordDeliveryForm = ({ onClose }) => {
  const { user } = useContext(AuthContext);

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [productsReceived, setProductsReceived] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    product: '',
    quantity: '',
    costAtTime: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [suppliersRes, productsRes] = await Promise.all([
          api.get('/suppliers'),
          api.get('/products'),
        ]);
        setSuppliers(suppliersRes.data);
        setProducts(productsRes.data);
      } catch (error) {
        setError('Failed to load initial data.');
      }
    };
    fetchData();
  }, []);

  const handleItemChange = (e) => {
    setCurrentItem({ ...currentItem, [e.target.name]: e.target.value });
  };

  const handleAddItem = () => {
    const { product, quantity, costAtTime } = currentItem;
    if (!product || !quantity || !costAtTime) {
      setError('Please fill all fields for the item.');
      return;
    }
    if (productsReceived.some(p => p.product === product)) {
      setError('This product has already been added to the list.');
      return;
    }

    const productDetails = products.find((p) => p._id === product);
    setProductsReceived([
      ...productsReceived,
      { ...currentItem, name: productDetails.name },
    ]);
    setCurrentItem({ product: '', quantity: '', costAtTime: '' });
    setError('');
  };

  const handleRemoveItem = (productId) => {
    setProductsReceived(productsReceived.filter((p) => p.product !== productId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSupplier || productsReceived.length === 0) {
      setError('Please select a supplier and add at least one product.');
      return;
    }

    const deliveryData = {
      supplier: selectedSupplier,
      productsReceived: productsReceived.map(({ name, ...rest }) => rest),
      recordedBy: user._id,
    };

    try {
      await api.post('/deliveries', deliveryData);
      onClose(); // Close modal on success
    } catch (err) {
      setError(
        `Failed to record delivery: ${err.response?.data?.message || err.message}`
      );
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <FormControl fullWidth required margin="normal">
        <InputLabel>Supplier</InputLabel>
        <Select
          value={selectedSupplier}
          label="Supplier"
          onChange={(e) => setSelectedSupplier(e.target.value)}
        >
          {suppliers.map((s) => (
            <MenuItem key={s._id} value={s._id}>
              {s.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Divider sx={{ my: 2 }}>
        <Typography variant="overline">Add Products</Typography>
      </Divider>

      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={5}>
          <FormControl fullWidth>
            <InputLabel>Product</InputLabel>
            <Select
              name="product"
              value={currentItem.product}
              label="Product"
              onChange={handleItemChange}
            >
              {products.map((p) => (
                <MenuItem key={p._id} value={p._id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} sm={2}>
          <TextField
            name="quantity"
            label="Quantity"
            type="number"
            value={currentItem.quantity}
            onChange={handleItemChange}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField
            name="costAtTime"
            label="Cost per Item"
            type="number"
            value={currentItem.costAtTime}
            onChange={handleItemChange}
            inputProps={{ step: "0.01" }}
          />
        </Grid>
        <Grid item xs={12} sm={2}>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleAddItem}
            startIcon={<AddCircleIcon />}
          >
            Add
          </Button>
        </Grid>
      </Grid>
      
      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
        Products in this Delivery
      </Typography>
      
      <Box sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        {productsReceived.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No products added yet.
          </Typography>
        ) : (
          <List dense>
            {productsReceived.map((item) => (
              <ListItem
                key={item.product}
                secondaryAction={
                  <IconButton edge="end" onClick={() => handleRemoveItem(item.product)}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={`${item.name}`}
                  secondary={`${item.quantity} x ₱${item.costAtTime} each`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 1 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            Save Delivery
          </Button>
      </Box>
    </Box>
  );
};

export default RecordDeliveryForm;