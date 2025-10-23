// client/src/components/RecordDeliveryForm.js
import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import AuthContext from '../context/AuthContext';
import ConfirmationContext from '../context/ConfirmationContext';
import { toast } from 'react-toastify'; // Import toast

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
  Tooltip,
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';

// Helper to format date to YYYY-MM-DD for the input
const formatDateForInput = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const RecordDeliveryForm = ({ onClose }) => {
  const { user } = useContext(AuthContext);
  const { confirm } = useContext(ConfirmationContext);

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  // --- NEW: deliveryDate state ---
  const [deliveryDate, setDeliveryDate] = useState(formatDateForInput(new Date())); // Default to today
  // --- END NEW ---
  const [productsReceived, setProductsReceived] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    product: '',
    quantity: '',
    costAtTime: '',
  });
  const [error, setError] = useState('');
  const [totalCostDisplay, setTotalCostDisplay] = useState(0); // State to display total cost

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [suppliersRes, productsRes] = await Promise.all([
          api.get('/suppliers'),
          api.get('/products?status=active'), // Fetch only active products
        ]);
        setSuppliers(suppliersRes.data);
        setProducts(productsRes.data);
      } catch (error) {
        setError('Failed to load initial data.');
        console.error("Error fetching form data:", error);
      }
    };
    fetchData();
  }, []);

  // --- NEW: useEffect to calculate total cost display ---
  useEffect(() => {
      const calculateTotal = () => {
          const total = productsReceived.reduce((sum, item) => {
              const qty = Number(item.quantity) || 0;
              const cost = Number(item.costAtTime) || 0;
              return sum + (qty * cost);
          }, 0);
          setTotalCostDisplay(total);
      };
      calculateTotal();
  }, [productsReceived]); // Recalculate whenever items change
  // --- END NEW ---

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    // Basic validation for quantity and cost inputs
    if ((name === 'quantity' || name === 'costAtTime') && value && parseFloat(value) < 0) {
        toast.warn(`${name === 'quantity' ? 'Quantity' : 'Cost'} cannot be negative.`);
        setCurrentItem({ ...currentItem, [name]: '0' }); // Reset to 0 or keep previous valid value
    } else {
        setCurrentItem({ ...currentItem, [name]: value });
    }
  };


  const handleAddItem = () => {
    setError(''); // Clear previous error
    const { product, quantity, costAtTime } = currentItem;
    if (!product || !quantity || !costAtTime) {
      setError('Please select a product and enter quantity & cost.');
      return;
    }
    const numQuantity = Number(quantity);
    const numCost = Number(costAtTime);
    if (isNaN(numQuantity) || numQuantity <= 0) {
        setError('Quantity must be a positive number.');
        return;
    }
    if (isNaN(numCost) || numCost < 0) {
        setError('Cost per item must be a non-negative number.');
        return;
    }

    if (productsReceived.some(p => p.product === product)) {
      setError('This product has already been added. Remove it first to change quantity/cost.');
      return;
    }

    const productDetails = products.find((p) => p._id === product);
    if (!productDetails) {
        setError('Selected product details not found.'); // Should not happen if products loaded correctly
        return;
    }

    setProductsReceived([
      ...productsReceived,
      {
          product: product, // Store ID
          quantity: numQuantity, // Store as number
          costAtTime: numCost, // Store as number
          name: productDetails.name // Keep name for display
       },
    ]);
    setCurrentItem({ product: '', quantity: '', costAtTime: '' }); // Reset form
  };

  const handleRemoveItem = (productId) => {
    setProductsReceived(productsReceived.filter((p) => p.product !== productId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous error

    // --- MODIFIED: Added deliveryDate validation ---
    if (!selectedSupplier || productsReceived.length === 0 || !deliveryDate) {
      setError('Please select a supplier, delivery date, and add at least one product.');
      return;
    }
    // Check if date is valid (basic check)
    if (isNaN(new Date(deliveryDate).getTime())) {
        setError('Invalid delivery date selected.');
        return;
    }
    // --- END MODIFICATION ---

    // Total cost is now calculated in useEffect, use totalCostDisplay
    const deliveryData = {
      supplier: selectedSupplier,
      deliveryDate: deliveryDate, // Add date
      productsReceived: productsReceived.map(({ name, ...rest }) => rest), // Remove name before sending
      totalCost: totalCostDisplay, // Send calculated total cost
      // recordedBy is added automatically by the backend via middleware
    };

    const isConfirmed = await confirm(
        'Confirm Delivery Record', // Title
        `Save delivery from ${suppliers.find(s => s._id === selectedSupplier)?.name || 'Unknown'} on ${new Date(deliveryDate).toLocaleDateString()} with a total cost of ₱${totalCostDisplay.toFixed(2)}? Stock levels will be updated.` // Message
    );

    if (isConfirmed) {
      try {
        await api.post('/deliveries', deliveryData);
        toast.success('Delivery recorded successfully!'); // Add success toast
        onClose(); // Close modal on success
      } catch (err) {
        const errMsg = err.response?.data?.message || err.message || 'Failed to record delivery.';
        setError(`Failed to record delivery: ${errMsg}`);
        console.error("Delivery save error:", err); // Log detailed error
        toast.error(`Error: ${errMsg}`); // Show error toast
      }
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2}>
          {/* Supplier */}
          <Grid item size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required margin="normal">
                <InputLabel>Supplier</InputLabel>
                <Select
                  value={selectedSupplier}
                  label="Supplier"
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                >
                  <MenuItem value=""><em>Select Supplier...</em></MenuItem>
                  {suppliers.map((s) => (
                    <MenuItem key={s._id} value={s._id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
          </Grid>
          {/* Delivery Date */}
          <Grid item size={{ xs: 12, sm: 6 }}>
              {/* --- NEW: Delivery Date Field --- */}
              <TextField
                label="Delivery Date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
                fullWidth
                margin="normal"
              />
              {/* --- END NEW --- */}
          </Grid>
      </Grid>

      <Divider sx={{ my: 2 }}>
        <Typography variant="overline">Add Products Received</Typography>
      </Divider>

      {/* Product Input Row */}
      <Grid container spacing={2} alignItems="center">
        <Grid item size={{ xs: 12, sm: 5 }}> {/* Adjusted size */}
          <FormControl fullWidth size="small">
            <InputLabel>Product</InputLabel>
            <Select
              name="product"
              value={currentItem.product}
              label="Product"
              onChange={handleItemChange}
              displayEmpty // Allows showing placeholder
            >
              <MenuItem value="" disabled><em>Select Product...</em></MenuItem>
              {products.map((p) => (
                <MenuItem key={p._id} value={p._id}>
                  {p.name} (Current Stock: {p.quantity})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item size={{ xs: 6, sm: 2 }}>
          <TextField
            name="quantity"
            label="Quantity"
            type="number"
            value={currentItem.quantity}
            onChange={handleItemChange}
            inputProps={{ min: "1" }} // Ensure positive
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item size={{ xs: 6, sm: 3 }}>
          <TextField
            name="costAtTime"
            label="Cost per Item (₱)"
            type="number"
            value={currentItem.costAtTime}
            onChange={handleItemChange}
            inputProps={{ step: "0.01", min: "0" }} // Ensure non-negative
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item size={{ xs: 12, sm: 2 }}> {/* Adjusted size */}
          <Tooltip title="Add Product to List">
            {/* Disable button slightly differently if fields missing */}
            <Box sx={{ display: 'flex', justifyContent: 'center'}}>
                <IconButton
                  color="primary"
                  onClick={handleAddItem}
                  disabled={!currentItem.product || !currentItem.quantity || !currentItem.costAtTime}
                >
                  <AddCircleIcon fontSize="large"/>
                </IconButton>
            </Box>
          </Tooltip>
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
        Items in Delivery List
      </Typography>

      {/* Items List */}
      <Box sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
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
                  <Tooltip title="Remove Item">
                    <IconButton edge="end" onClick={() => handleRemoveItem(item.product)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemText
                  primary={`${item.name}`}
                  secondary={`${item.quantity} x ₱${Number(item.costAtTime).toFixed(2)} each = ₱${(item.quantity * item.costAtTime).toFixed(2)}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>

       {/* --- NEW: Total Cost Display --- */}
       <Typography variant="subtitle1" sx={{ fontWeight: 'bold', textAlign: 'right', mb: 2 }}>
            Estimated Total Cost: ₱{totalCostDisplay.toFixed(2)}
       </Typography>
       {/* --- END NEW --- */}


      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 1 }}>
          <Button onClick={onClose} color="inherit">Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={productsReceived.length === 0 || !selectedSupplier || !deliveryDate} // Disable if no items/supplier/date
          >
            Save Delivery
          </Button>
      </Box>
    </Box>
  );
};

export default RecordDeliveryForm;