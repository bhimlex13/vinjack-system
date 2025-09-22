// client/src/pages/CreatePurchaseOrderPage.js
import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPurchaseOrder, getSuppliers, getProducts } from '../api/purchaseOrderApi';
import { toast } from 'react-toastify';
import ConfirmationContext from '../context/ConfirmationContext';
import PurchaseOrderPrintout from '../components/PurchaseOrderPrintout';

// MUI Imports
import {
  Container, Typography, Box, Paper, Grid, TextField, Button, Autocomplete,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton,
  CircularProgress, Alert, Dialog, DialogContent, DialogActions
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import PrintIcon from '@mui/icons-material/Print';

const CreatePurchaseOrderPage = () => {
  const navigate = useNavigate();
  const { confirm } = useContext(ConfirmationContext);
  const printoutRef = useRef();

  // Form State
  const [supplier, setSupplier] = useState(null);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  
  // Data State
  const [suppliersList, setSuppliersList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createdPO, setCreatedPO] = useState(null);

  // Item Addition State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [cost, setCost] = useState(0);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [suppliersData, productsData] = await Promise.all([getSuppliers(), getProducts()]);
        setSuppliersList(suppliersData);
        setProductsList(productsData);
        setError(null);
      } catch (err) {
        setError('Failed to load necessary data. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const handleAddItem = () => {
    if (!selectedProduct || quantity <= 0 || cost < 0) {
      toast.warn('Please select a product and enter a valid quantity and cost.');
      return;
    }
    if (items.some(item => item.product._id === selectedProduct._id)) {
      toast.warn(`${selectedProduct.name} is already in the purchase order.`);
      return;
    }
    const newItem = { product: selectedProduct, quantity, cost };
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

    const isConfirmed = await confirm('Create this Purchase Order? Details cannot be edited after creation.');
    if (!isConfirmed) {
      return;
    }

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
        const newPO = await createPurchaseOrder(purchaseOrderData);
        toast.success('Purchase Order created successfully!');

        // --- THIS IS THE FIX: Manually add the full supplier object to the PO data ---
        const completePOData = {
          ...newPO,
          supplier: supplier, // Use the full supplier object from the component's state
        };
        setCreatedPO(completePOData); // Store the complete data to trigger the print modal
        // --- END FIX ---

    } catch (err) {
        toast.error('Failed to create Purchase Order. Please try again.');
        console.error(err);
    }
  };

  const handlePrint = () => {
    const printContents = printoutRef.current.innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = `<div class="print-container">${printContents}</div>`;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); 
  };

  const handleClosePrintModal = () => {
    setCreatedPO(null);
    navigate('/purchase-orders'); 
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Dialog open={!!createdPO} onClose={handleClosePrintModal} maxWidth="md" fullWidth>
        <DialogContent>
          <PurchaseOrderPrintout poData={createdPO} ref={printoutRef} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePrintModal}>Close</Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
            Print / Download PDF
          </Button>
        </DialogActions>
      </Dialog>

      <Typography variant="h4" component="h1" gutterBottom>
        Create New Purchase Order
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item size={{ xs: 12 }}>
            <Autocomplete
              options={suppliersList}
              getOptionLabel={(option) => option.name}
              value={supplier}
              onChange={(event, newValue) => setSupplier(newValue)}
              renderInput={(params) => <TextField {...params} label="Select Supplier" variant="outlined" />}
            />
          </Grid>
          
          <Grid item size={{ xs: 12 }}>
            <Typography variant="h6">Add Items</Typography>
          </Grid>
          <Grid item size={{ xs: 12, md: 5 }}>
            <Autocomplete
              options={productsList.filter(p => !items.some(item => item.product._id === p._id))}
              getOptionLabel={(option) => `${option.name} (${option.itemCode})`}
              value={selectedProduct}
              onChange={(event, newValue) => {
                setSelectedProduct(newValue);
                setCost(newValue ? newValue.cost : 0);
              }}
              renderInput={(params) => <TextField {...params} label="Select Product" />}
            />
          </Grid>
          <Grid item size={{ xs: 6, md: 2 }}>
            <TextField label="Quantity" type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10)))} fullWidth />
          </Grid>
          <Grid item size={{ xs: 6, md: 2 }}>
            <TextField label="Unit Cost" type="number" value={cost} onChange={(e) => setCost(Math.max(0, parseFloat(e.target.value)))} fullWidth />
          </Grid>
          <Grid item size={{ xs: 12, md: 3 }}>
            <Button variant="outlined" startIcon={<AddCircleIcon />} onClick={handleAddItem} fullWidth sx={{height: '100%'}}>
              Add Item
            </Button>
          </Grid>

          <Grid item size={{ xs: 12 }}>
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
                      <TableCell>{item.product.name}</TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">{item.cost.toFixed(2)}</TableCell>
                      <TableCell align="right">{(item.quantity * item.cost).toFixed(2)}</TableCell>
                      <TableCell align="center">
                        <IconButton onClick={() => handleRemoveItem(item.product._id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} align="right"><Typography variant="h6">Grand Total</Typography></TableCell>
                    <TableCell align="right"><Typography variant="h6">{grandTotal.toFixed(2)}</Typography></TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          
          <Grid item size={{ xs: 12 }}>
            <TextField label="Notes (Optional)" multiline rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth />
          </Grid>
          <Grid item size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="text" color="secondary" onClick={() => navigate('/purchase-orders')}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit}>Save Purchase Order</Button>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default CreatePurchaseOrderPage;