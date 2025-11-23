// client/src/components/RecordDeliveryForm.js
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { createDelivery } from '../api/deliveryApi';
import api from '../api/axios';
import AuthContext from '../context/AuthContext';
import ConfirmationContext from '../context/ConfirmationContext';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion'; // --- NEW IMPORT ---

// MUI Imports
import {
  Box, Button, FormControl, InputLabel, Select, MenuItem, Grid, TextField,
  Typography, IconButton, Divider, Alert, Tooltip, Autocomplete,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';

// --- NEW IMPORT ---
import LoadingSpinner from './LoadingSpinner';

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
  const [deliveryType, setDeliveryType] = useState('Purchase');
  const [deliveryDate, setDeliveryDate] = useState(formatDateForInput(new Date()));
  const [productsReceived, setProductsReceived] = useState([]);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [costAtTime, setCostAtTime] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProductLoading, setIsProductLoading] = useState(false);

  // --- FRAMER MOTION VARIANTS ---
  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  };
  // ------------------------------

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setIsProductLoading(true);
      try {
        const [suppliersRes, productsRes] = await Promise.all([
          api.get('/suppliers?status=Approved'), 
          api.get('/products?status=active'),
        ]);
        setSuppliers(suppliersRes.data);
        setProducts(productsRes.data);
        setError('');
      } catch (error) {
        setError('Failed to load initial data.');
        console.error("Error fetching form data:", error);
      } finally {
        setIsLoading(false);
        setIsProductLoading(false);
      }
    };
    fetchData();
  }, []);
  
  const handleSupplierChange = (e) => {
    const supplierId = e.target.value;
    setSelectedSupplier(supplierId);
    const supplier = suppliers.find(s => s._id === supplierId);
    if (supplier) {
      setDeliveryType(supplier.defaultPaymentTerms === 'Consignment' ? 'Consignment' : 'Purchase');
    } else {
      setDeliveryType('Purchase');
    }
  };

  const totalCost = useMemo(() => {
      return productsReceived.reduce((sum, item) => {
          const qty = Number(item.quantity) || 0;
          const cost = Number(item.costAtTime) || 0;
          return sum + (qty * cost);
      }, 0);
  }, [productsReceived]);

  const handleProductSelection = (event, newValue) => {
    setSelectedProduct(newValue);
    if (newValue && selectedSupplier) {
      const supplierCost = newValue.supplierCosts?.find(c => c.supplier === selectedSupplier);
      setCostAtTime(supplierCost?.cost?.toString() ?? newValue.defaultCost?.toString() ?? '');
    } else if (newValue) {
      setCostAtTime(newValue.defaultCost?.toString() || '');
    } else {
      setCostAtTime('');
    }
    setQuantity('1');
  };

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    if (value === '' || (Number(value) >= 1 && Number.isInteger(Number(value)))) {
       setQuantity(value);
    } else if (Number(value) < 1) {
       setQuantity('1');
    }
  };

  const handleCostChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      if (parseFloat(value) < 0) {
        setCostAtTime('0');
      } else {
        setCostAtTime(value);
      }
    }
  };

  const handleAddItem = () => {
    setError('');
    // --- VALIDATION ---
    if (!selectedProduct) {
        setError('Please select a product.');
        return;
    }
    if (!quantity || Number(quantity) <= 0) {
        setError('Please enter a valid quantity.');
        return;
    }
    if (!costAtTime || Number(costAtTime) < 0) {
        setError('Please enter a valid cost.');
        return;
    }
    // ------------------

    const numQuantity = Number(quantity);
    const numCost = Number(costAtTime);

    if (productsReceived.some(p => p.product._id === selectedProduct._id)) {
      setError(`${selectedProduct.name} is already in the list. Remove it first to change quantity/cost.`);
      return;
    }

    setProductsReceived([
      ...productsReceived,
      {
          product: selectedProduct,
          quantity: numQuantity,
          costAtTime: numCost,
       },
    ]);

    setSelectedProduct(null);
    setQuantity('');
    setCostAtTime('');
  };

  const handleRemoveItem = (productId) => {
    setProductsReceived(productsReceived.filter((p) => p.product._id !== productId));
  };

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

    const deliveryData = {
      supplier: selectedSupplier,
      deliveryDate: deliveryDate,
      deliveryType: deliveryType,
      productsReceived: productsReceived.map(item => ({
        product: item.product._id,
        quantity: Number(item.quantity),
        costAtTime: Number(item.costAtTime)
      })),
      totalCost: totalCost,
    };

    const supplierName = suppliers.find(s => s._id === selectedSupplier)?.name || 'Unknown Supplier';
    const formattedDate = new Date(deliveryDate).toLocaleDateString();
    const formattedTotal = totalCost.toFixed(2);

    const isConfirmed = await confirm(
        `Confirm ${deliveryType} Delivery`,
        `Save ${deliveryType.toUpperCase()} delivery from ${supplierName} on ${formattedDate} with ${productsReceived.length} item(s) (Total: ₱${formattedTotal})? Stock levels will be updated.`
    );

    if (isConfirmed) {
      setIsLoading(true);
      try {
        await createDelivery(deliveryData);
        toast.success('Direct delivery recorded successfully and stock updated!');
        onClose();
      } catch (err) {
        const errMsg = err.response?.data?.message || err.message || 'Failed to record delivery.';
        setError(`Failed to record delivery: ${errMsg}`);
        toast.error(`Error: ${errMsg}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const productOptions = useMemo(() => {
    const addedIds = new Set(productsReceived.map(item => item.product._id));
    return products.filter(p => !addedIds.has(p._id));
  }, [products, productsReceived]);

  // --- LOADING SPINNER ON INIT ---
  if (isLoading && suppliers.length === 0) {
      return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
              <LoadingSpinner text="Loading form data..." />
          </Box>
      );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Grid container spacing={2}>
          <Grid item size={{ xs: 12, sm: 5 }}>
              <FormControl fullWidth required margin="dense">
                <InputLabel>Supplier</InputLabel>
                <Select
                  value={selectedSupplier}
                  label="Supplier"
                  onChange={handleSupplierChange}
                  disabled={isLoading}
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
          <Grid item size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Delivery Date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
                fullWidth
                margin="dense"
                disabled={isLoading}
              />
          </Grid>
          <Grid item size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth required margin="dense">
              <InputLabel>Type</InputLabel>
              <Select
                value={deliveryType}
                label="Type"
                onChange={(e) => setDeliveryType(e.target.value)}
                disabled={isLoading || !selectedSupplier}
              >
                <MenuItem value="Purchase">Purchase</MenuItem>
                <MenuItem value="Consignment">Consignment</MenuItem>
              </Select>
            </FormControl>
          </Grid>
      </Grid>

      <Divider sx={{ my: 2 }}>
        <Typography variant="overline">Add Products Received</Typography>
      </Divider>

      <Grid container spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Grid item size={{ xs: 12, md: 5 }}>
          <Autocomplete
            options={productOptions}
            getOptionLabel={(option) => `${option.name} (${option.itemCode})`}
            isOptionEqualToValue={(option, value) => option._id === value._id}
            value={selectedProduct}
            onChange={handleProductSelection}
            loading={isProductLoading}
            disabled={isLoading || isProductLoading || !selectedSupplier}
            size="small"
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Product"
                helperText={!selectedSupplier ? "Select supplier first" : ""}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {isProductLoading ? <LoadingSpinner text="" /> : null} 
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </Grid>
        <Grid item size={{ xs: 4, md: 2 }}>
          <TextField
            label="Quantity"
            type="number"
            value={quantity}
            onChange={handleQuantityChange}
            inputProps={{ min: 1 }}
            fullWidth
            size="small"
            disabled={isLoading || !selectedProduct}
          />
        </Grid>
        <Grid item size={{ xs: 5, md: 3 }}>
          <TextField
            label="Cost per Item (₱)"
            type="number"
            value={costAtTime}
            onChange={handleCostChange}
            inputProps={{ step: "0.01", min: 0 }}
            fullWidth
            size="small"
            disabled={isLoading || !selectedProduct}
          />
        </Grid>
        <Grid item size={{ xs: 3, md: 2 }} sx={{ textAlign: 'center' }}>
          <Tooltip title="Add Product to Delivery List">
            <span>
              <IconButton
                color="primary"
                onClick={handleAddItem}
                disabled={!selectedProduct || !quantity || !costAtTime || isLoading || isProductLoading}
                size="large"
              >
                <AddCircleIcon fontSize="inherit"/>
              </IconButton>
            </span>
          </Tooltip>
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
        Items in this Delivery
      </Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 250, mb: 2 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell align="right">Unit Cost</TableCell>
              <TableCell align="right">Subtotal</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody component={AnimatePresence}>
            {productsReceived.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary">No products added yet.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              productsReceived.map((item) => (
                <TableRow 
                    key={item.product._id} 
                    hover
                    component={motion.tr}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                >
                  <TableCell>{item.product.name} ({item.product.itemCode})</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">₱{Number(item.costAtTime).toFixed(2)}</TableCell>
                  <TableCell align="right">₱{(item.quantity * item.costAtTime).toFixed(2)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Remove Item">
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
            {productsReceived.length > 0 && (
                 <TableRow sx={{ '& td': { borderTop: '2px solid black', fontWeight: 'bold' } }}>
                     <TableCell colSpan={3} align="right">Total Cost:</TableCell>
                     <TableCell align="right">₱{totalCost.toFixed(2)}</TableCell>
                     <TableCell />
                 </TableRow>
             )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
          <Button onClick={onClose} color="inherit" disabled={isLoading}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={productsReceived.length === 0 || !selectedSupplier || !deliveryDate || isLoading}
          >
            {isLoading ? <LoadingSpinner text="" /> : 'Save Delivery & Update Stock'}
          </Button>
      </Box>
    </Box>
  );
};

export default RecordDeliveryForm;