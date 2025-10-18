// client/src/pages/CreatePurchaseOrderPage.js
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSuppliers, createPurchaseOrder } from '../api/purchaseOrderApi';
import { getProductsBySupplier } from '../api/productApi';
import { toast } from 'react-toastify';
import ConfirmationContext from '../context/ConfirmationContext';

// MUI Imports
import {
  Container, Typography, Box, Paper, Grid, TextField, Button, Autocomplete,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton,
  CircularProgress, Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';

const CreatePurchaseOrderPage = () => {
  const navigate = useNavigate();
  const { confirm } = useContext(ConfirmationContext);

  // Form State
  const [supplier, setSupplier] = useState(null);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');

  // Data State
  const [suppliersList, setSuppliersList] = useState([]);
  const [supplierProducts, setSupplierProducts] = useState([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [isProductLoading, setIsProductLoading] = useState(false);
  const [error, setError] = useState(null);

  // Item Addition State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [cost, setCost] = useState(0);

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        setLoading(true);
        const suppliersData = await getSuppliers();
        setSuppliersList(suppliersData);
        setError(null);
      } catch (err) {
        setError('Failed to load suppliers. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadSuppliers();
  }, []);

  const handleSupplierChange = async (event, newValue) => {
    if (supplier && items.length > 0 && newValue?._id !== supplier._id) {
        const isConfirmed = await confirm(
            'Reset Purchase Order?',
            'Changing the supplier will clear all currently added items. Are you sure you want to proceed?'
        );
      if (!isConfirmed) {
        return;
      }
    }

    setSupplier(newValue);
    setItems([]);
    setSupplierProducts([]);
    setSelectedProduct(null);
    setQuantity(1);
    setCost(0);

    if (newValue) {
      setIsProductLoading(true);
      try {
        const productsData = await getProductsBySupplier(newValue._id);
        setSupplierProducts(productsData);
      } catch (err) {
        toast.error(`Failed to load products for ${newValue.name}.`);
        console.error(err);
      } finally {
        setIsProductLoading(false);
      }
    }
  };


  const handleAddItem = () => {
    if (!selectedProduct || quantity <= 0 || cost < 0) {
      toast.warn('Please select a product and enter a valid quantity and cost.');
      return;
    }
    if (items.some(item => item.product._id === selectedProduct._id)) {
      toast.warn(`${selectedProduct.name} is already in the purchase order.`);
      return;
    }
    const newItem = {
      product: selectedProduct,
      quantity: Number(quantity),
      cost: Number(cost)
    };
    setItems([...items, newItem]);

    setSelectedProduct(null);
    setQuantity(1);
    setCost(0);
  };

  const handleRemoveItem = (productId) => {
    setItems(items.filter(item => item.product._id !== productId));
  };

  const grandTotal = useMemo(() => {
    return items.reduce((total, item) => total + (item.quantity * item.cost), 0);
  }, [items]);

  const handleSubmit = async () => {
    if (!supplier) {
        toast.error('Please select a supplier.');
        return;
    }
    if (items.length === 0) {
        toast.error('Please add at least one item to the purchase order.');
        return;
    }

    const confirmationMessage = supplier.email
      ? `This will create the Purchase Order and send an email with the review link to ${supplier.name} (${supplier.email}). Proceed?`
      : `This will create the Purchase Order. The supplier (${supplier.name}) does not have an email address saved. You will need to copy the link from the PO details page. Proceed?`;

    const isConfirmed = await confirm('Confirm Purchase Order Creation', confirmationMessage);
    if (!isConfirmed) return;

    const purchaseOrderData = {
        supplier: supplier._id,
        items: items.map(item => ({
            product: item.product._id,
            quantity: item.quantity,
            unitCost: item.cost,
        })),
        notes,
    };

    try {
        setLoading(true);
        const newPO = await createPurchaseOrder(purchaseOrderData);
        toast.success(`Purchase Order ${newPO.poNumber} created and email sent (if applicable)!`);
        navigate(`/purchase-orders/${newPO._id}`);
    } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to create Purchase Order.');
        console.error(err);
        setLoading(false);
    }
  };

  if (loading && !suppliersList.length) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Create New Purchase Order
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* --- SYNTAX UPDATED --- */}
          <Grid item size={{ xs: 12 }}>
            <Typography variant="h6" gutterBottom>Step 1: Select Supplier</Typography>
            <Autocomplete
              options={suppliersList}
              getOptionLabel={(option) => option.name || ''}
              isOptionEqualToValue={(option, value) => option._id === value._id}
              value={supplier}
              onChange={handleSupplierChange}
              renderInput={(params) => <TextField {...params} label="Select Supplier" variant="outlined" />}
            />
          </Grid>

          {supplier && (
            <>
              {/* --- SYNTAX UPDATED --- */}
              <Grid item size={{ xs: 12 }}>
                <Typography variant="h6">Step 2: Add Items</Typography>
              </Grid>

              {/* --- SYNTAX UPDATED --- */}
              <Grid item size={{ xs: 12 }}>
                <Grid container spacing={2} alignItems="center">
                  {/* --- SYNTAX UPDATED --- */}
                  <Grid item size={{ xs: 12, sm: 6, md: 5 }}>
                    <Autocomplete
                      options={supplierProducts.filter(p => !items.some(item => item.product._id === p._id))}
                      getOptionLabel={(option) => `${option.name} (${option.itemCode})`}
                      isOptionEqualToValue={(option, value) => option._id === value._id}
                      value={selectedProduct}
                      onChange={(event, newValue) => {
                        setSelectedProduct(newValue);
                        setCost(newValue?.cost ?? 0);
                        setQuantity(1);
                      }}
                      loading={isProductLoading}
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
                  {/* --- SYNTAX UPDATED --- */}
                  <Grid item size={{ xs: 6, sm: 3, md: 2 }}>
                    <TextField label="Quantity" type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10)) || 1)} fullWidth inputProps={{ min: 1 }} />
                  </Grid>
                  {/* --- SYNTAX UPDATED --- */}
                  <Grid item size={{ xs: 6, sm: 3, md: 3 }}>
                    <TextField label="Unit Cost (₱)" type="number" value={cost} onChange={(e) => setCost(Math.max(0, parseFloat(e.target.value)) || 0)} fullWidth inputProps={{ step: "0.01", min: 0 }} />
                  </Grid>
                  {/* --- SYNTAX UPDATED --- */}
                  <Grid item size={{ xs: 12, sm: 12, md: 2 }}>
                    <Button
                        variant="contained"
                        startIcon={<AddCircleIcon />}
                        onClick={handleAddItem}
                        disabled={!selectedProduct || isProductLoading}
                        fullWidth
                        sx={{ height: '56px' }}
                    >
                      Add
                    </Button>
                  </Grid>
                </Grid>
              </Grid>

              {/* --- SYNTAX UPDATED --- */}
              <Grid item size={{ xs: 12 }}>
                {/* Item Table */}
                <TableContainer component={Paper} variant="outlined">
                  <Table>
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
                      {items.map((item) => (
                        <TableRow key={item.product._id}>
                          <TableCell>{item.product.name} ({item.product.itemCode})</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">₱{item.cost.toFixed(2)}</TableCell>
                          <TableCell align="right">₱{(item.quantity * item.cost).toFixed(2)}</TableCell>
                          <TableCell align="center">
                            <IconButton onClick={() => handleRemoveItem(item.product._id)} color="error" size="small">
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {items.length === 0 ? (
                        <TableRow><TableCell colSpan={5} align="center">No items added yet.</TableCell></TableRow>
                      ) : (
                        <TableRow sx={{ '& td': { border: 0 } }}>
                          <TableCell colSpan={3} align="right"><Typography variant="h6">Grand Total:</Typography></TableCell>
                          <TableCell align="right"><Typography variant="h6">₱{grandTotal.toFixed(2)}</Typography></TableCell>
                          <TableCell />
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {/* --- SYNTAX UPDATED --- */}
              <Grid item size={{ xs: 12 }}>
                <TextField label="Notes (Optional)" multiline rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth />
              </Grid>

              {/* --- SYNTAX UPDATED --- */}
              <Grid item size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button variant="outlined" color="secondary" onClick={() => navigate('/purchase-orders')}>Cancel</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={loading || items.length === 0 || !supplier}>
                  {loading ? <CircularProgress size={24} /> : 'Send Purchase Order'}
                </Button>
              </Grid>
            </>
          )}
        </Grid>
      </Paper>
    </Container>
  );
};

export default CreatePurchaseOrderPage;