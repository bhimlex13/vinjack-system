// client/src/components/RecordDeliveryForm.js
import React, { useState, useEffect, useContext, useMemo } from 'react'; // Added useMemo
import api from '../api/axios';
import AuthContext from '../context/AuthContext';
import ConfirmationContext from '../context/ConfirmationContext';
import { toast } from 'react-toastify';

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
  IconButton,
  Divider,
  Alert,
  Tooltip,
  Autocomplete, // <-- NEW: Import Autocomplete
  TableContainer, // <-- NEW: Import Table components
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper, // <-- NEW: Import Paper
  CircularProgress // <-- NEW: Import CircularProgress
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
  const [products, setProducts] = useState([]); // List of available products for Autocomplete
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(formatDateForInput(new Date()));
  const [productsReceived, setProductsReceived] = useState([]); // Items added to the delivery list

  // --- MODIFIED: State for the current item being added ---
  const [selectedProduct, setSelectedProduct] = useState(null); // Holds the selected product object from Autocomplete
  const [quantity, setQuantity] = useState(''); // Current quantity input
  const [costAtTime, setCostAtTime] = useState(''); // Current cost input
  // --- END MODIFICATION ---

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false); // General loading state
  const [isProductLoading, setIsProductLoading] = useState(false); // Product list loading state

  // Fetch initial suppliers and products
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true); // Start general loading
      setIsProductLoading(true);
      try {
        const [suppliersRes, productsRes] = await Promise.all([
          api.get('/suppliers'),
          api.get('/products?status=active'), // Fetch only active products
        ]);
        setSuppliers(suppliersRes.data);
        setProducts(productsRes.data);
        setError(''); // Clear error on success
      } catch (error) {
        setError('Failed to load initial data.');
        console.error("Error fetching form data:", error);
      } finally {
        setIsLoading(false); // Stop general loading
        setIsProductLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate total cost using useMemo for efficiency
  const totalCost = useMemo(() => {
      return productsReceived.reduce((sum, item) => {
          const qty = Number(item.quantity) || 0;
          const cost = Number(item.costAtTime) || 0;
          return sum + (qty * cost);
      }, 0);
  }, [productsReceived]);

  // --- NEW: Handle Autocomplete product selection ---
  const handleProductSelection = (event, newValue) => {
    setSelectedProduct(newValue);
    // Optionally pre-fill cost if available (e.g., defaultCost)
    setCostAtTime(newValue?.defaultCost?.toString() || ''); // Use default cost if available
    setQuantity('1'); // Reset quantity to 1 when selecting a new product
  };
  // --- END NEW ---

  // Handle quantity input change
  const handleQuantityChange = (e) => {
    const value = e.target.value;
    if (value === '' || (Number(value) >= 1 && Number.isInteger(Number(value)))) {
       setQuantity(value);
    } else if (Number(value) < 1) {
       setQuantity('1'); // Reset to 1 if below 1
    }
  };

  // Handle cost input change
  const handleCostChange = (e) => {
    const value = e.target.value;
    // Allow empty, numbers, and one decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      // Basic check for non-negative
      if (parseFloat(value) < 0) {
        setCostAtTime('0');
      } else {
        setCostAtTime(value);
      }
    }
  };

  // Add the selected item to the delivery list table
  const handleAddItem = () => {
    setError('');
    if (!selectedProduct || !quantity || !costAtTime) {
      setError('Please select a product and enter quantity & cost.');
      return;
    }
    const numQuantity = Number(quantity);
    const numCost = Number(costAtTime);
    if (isNaN(numQuantity) || numQuantity <= 0) {
        setError('Quantity must be a positive whole number.');
        return;
    }
    if (isNaN(numCost) || numCost < 0) {
        setError('Cost per item must be a non-negative number.');
        return;
    }

    // Check if product already exists in the list
    if (productsReceived.some(p => p.product._id === selectedProduct._id)) {
      setError(`${selectedProduct.name} is already in the list. Remove it first to change quantity/cost.`);
      return;
    }

    setProductsReceived([
      ...productsReceived,
      {
          product: selectedProduct, // Store the whole product object temporarily for display
          quantity: numQuantity,
          costAtTime: numCost,
       },
    ]);

    // Reset inputs
    setSelectedProduct(null); // Clear Autocomplete
    setQuantity('');
    setCostAtTime('');
  };

  // Remove item from the delivery list table
  const handleRemoveItem = (productId) => {
    setProductsReceived(productsReceived.filter((p) => p.product._id !== productId));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedSupplier || productsReceived.length === 0 || !deliveryDate) {
      setError('Please select a supplier, delivery date, and add at least one product.');
      return;
    }
    if (isNaN(new Date(deliveryDate).getTime())) {
        setError('Invalid delivery date selected.');
        return;
    }

    // Prepare data for API: only send necessary fields
    const deliveryData = {
      supplier: selectedSupplier,
      deliveryDate: deliveryDate,
      // Map productsReceived to send only product ID and numeric quantity/cost
      productsReceived: productsReceived.map(item => ({
        product: item.product._id, // Send only the ID
        quantity: Number(item.quantity),
        costAtTime: Number(item.costAtTime)
      })),
      totalCost: totalCost, // Send calculated total cost
    };

    const supplierName = suppliers.find(s => s._id === selectedSupplier)?.name || 'Unknown Supplier';
    const formattedDate = new Date(deliveryDate).toLocaleDateString();
    const formattedTotal = totalCost.toFixed(2);

    const isConfirmed = await confirm(
        'Confirm Delivery Record',
        `Save delivery from ${supplierName} on ${formattedDate} with ${productsReceived.length} item(s) and a total cost of ₱${formattedTotal}? Stock levels will be updated.`
    );

    if (isConfirmed) {
      setIsLoading(true); // Indicate submission processing
      try {
        await api.post('/deliveries', deliveryData);
        toast.success('Direct delivery recorded successfully and stock updated!');
        onClose(); // Close modal on success
      } catch (err) {
        const errMsg = err.response?.data?.message || err.message || 'Failed to record delivery.';
        setError(`Failed to record delivery: ${errMsg}`);
        toast.error(`Error: ${errMsg}`);
      } finally {
        setIsLoading(false); // Stop loading indicator
      }
    }
  };

  // Filter products for Autocomplete - exclude those already added
  const productOptions = useMemo(() => {
    const addedIds = new Set(productsReceived.map(item => item.product._id));
    return products.filter(p => !addedIds.has(p._id));
  }, [products, productsReceived]);

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}> {/* Added margin top */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2}>
          {/* Supplier */}
          <Grid item size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required margin="dense"> {/* Changed margin */}
                <InputLabel>Supplier</InputLabel>
                <Select
                  value={selectedSupplier}
                  label="Supplier"
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  disabled={isLoading} // Disable while loading
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
              <TextField
                label="Delivery Date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
                fullWidth
                margin="dense" // Changed margin
                disabled={isLoading} // Disable while loading
              />
          </Grid>
      </Grid>

      <Divider sx={{ my: 2 }}>
        <Typography variant="overline">Add Products Received</Typography>
      </Divider>

      {/* --- MODIFIED: Product Input Row using Autocomplete --- */}
      <Grid container spacing={1} alignItems="center" sx={{ mb: 2 }}> {/* Reduced spacing */}
        {/* Product Autocomplete */}
        <Grid item size={{ xs: 12, md: 5 }}>
          <Autocomplete
            options={productOptions} // Use filtered options
            getOptionLabel={(option) => `${option.name} (${option.itemCode})`}
            isOptionEqualToValue={(option, value) => option._id === value._id}
            value={selectedProduct}
            onChange={handleProductSelection}
            loading={isProductLoading}
            disabled={isLoading || isProductLoading} // Disable while loading
            size="small" // Make Autocomplete smaller
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Product"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {isProductLoading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </Grid>
        {/* Quantity */}
        <Grid item size={{ xs: 4, md: 2 }}>
          <TextField
            label="Quantity"
            type="number" // Keep as number type
            value={quantity}
            onChange={handleQuantityChange}
            inputProps={{ min: 1 }} // Min 1
            fullWidth
            size="small" // Make smaller
            disabled={isLoading || !selectedProduct} // Disable if no product selected or loading
          />
        </Grid>
        {/* Cost */}
        <Grid item size={{ xs: 5, md: 3 }}>
          <TextField
            label="Cost per Item (₱)"
            type="number" // Keep as number type
            value={costAtTime}
            onChange={handleCostChange}
            inputProps={{ step: "0.01", min: 0 }} // Min 0
            fullWidth
            size="small" // Make smaller
            disabled={isLoading || !selectedProduct} // Disable if no product selected or loading
          />
        </Grid>
        {/* Add Button */}
        <Grid item size={{ xs: 3, md: 2 }} sx={{ textAlign: 'center' }}>
          <Tooltip title="Add Product to Delivery List">
            {/* Wrap IconButton in Box for centering/sizing if needed */}
            <span> {/* Span needed for Tooltip when button is disabled */}
              <IconButton
                color="primary"
                onClick={handleAddItem}
                disabled={!selectedProduct || !quantity || !costAtTime || isLoading || isProductLoading} // Disable if fields missing or loading
                size="large" // Keep button prominent
              >
                <AddCircleIcon fontSize="inherit"/>
              </IconButton>
            </span>
          </Tooltip>
        </Grid>
      </Grid>
      {/* --- END MODIFICATION --- */}

      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}> {/* Reduced margin */}
        Items in this Delivery
      </Typography>

      {/* --- MODIFIED: Items Table (similar to CreatePurchaseOrderPage) --- */}
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 250, mb: 2 }}> {/* Added max height and margin */}
        <Table stickyHeader size="small"> {/* Make table smaller */}
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell align="right">Unit Cost</TableCell>
              <TableCell align="right">Subtotal</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {productsReceived.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary">No products added yet.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              productsReceived.map((item) => (
                <TableRow key={item.product._id} hover>
                  <TableCell>{item.product.name} ({item.product.itemCode})</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">₱{Number(item.costAtTime).toFixed(2)}</TableCell>
                  <TableCell align="right">₱{(item.quantity * item.costAtTime).toFixed(2)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Remove Item">
                      {/* Disable remove button while submitting */}
                      <span>
                        <IconButton
                          onClick={() => handleRemoveItem(item.product._id)}
                          color="error"
                          size="small"
                          disabled={isLoading}
                        >
                          <DeleteIcon fontSize="small"/>
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
            {/* Show Total Row only if items exist */}
            {productsReceived.length > 0 && (
                 <TableRow sx={{ '& td': { borderTop: '2px solid black', fontWeight: 'bold' } }}>
                     <TableCell colSpan={3} align="right">Total Cost:</TableCell>
                     <TableCell align="right">₱{totalCost.toFixed(2)}</TableCell>
                     <TableCell /> {/* Empty cell for actions column */}
                 </TableRow>
             )}
          </TableBody>
        </Table>
      </TableContainer>
      {/* --- END MODIFICATION --- */}


      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}> {/* Reduced margin */}
          <Button onClick={onClose} color="inherit" disabled={isLoading}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={productsReceived.length === 0 || !selectedSupplier || !deliveryDate || isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Save Delivery & Update Stock'} {/* Updated text */}
          </Button>
      </Box>
    </Box>
  );
};

export default RecordDeliveryForm;