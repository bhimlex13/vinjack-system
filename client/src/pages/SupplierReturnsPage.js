// client/src/pages/SupplierReturnsPage.js
import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import ConfirmationContext from '../context/ConfirmationContext';
import { getSupplierCompletedOrders } from '../api/supplierApi';

import {
  Container, Typography, Button, Box, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, TextField, Autocomplete,
  IconButton, CircularProgress, Tooltip, FormControl, InputLabel, Select, MenuItem,
  Checkbox, FormControlLabel, Chip,
  List, // Keep List for the table
  ListItem, // Keep ListItem for the table
  Divider,
  FormHelperText,
  // --- NEW IMPORTS (from CreatePurchaseOrderPage.js) ---
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
  // --- END NEW IMPORTS ---
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'; 


// Main Page Component
const SupplierReturnsPage = () => {
  const [returns, setReturns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { confirm } = useContext(ConfirmationContext);

  // Modal State
  const [modalLoading, setModalLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [allProducts, setAllProducts] = useState([]); // All products (fallback)
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [notes, setNotes] = useState('');
  
  const [completedOrders, setCompletedOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOrderLoading, setIsOrderLoading] = useState(false);

  // --- MODIFIED: State for the "Add Item" bar ---
  const [itemsToReturn, setItemsToReturn] = useState([]); // This is now the "cart"
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('Defective');
  const [wasConsigned, setWasConsigned] = useState(false);
  const [maxQuantity, setMaxQuantity] = useState(Infinity);
  // --- END MODIFICATION ---

  const fetchReturns = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/supplier-returns');
      setReturns(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch supplier returns.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  // Load data for the modal
  const fetchModalData = async () => {
    setModalLoading(true);
    setCompletedOrders([]);
    setSelectedOrder(null);
    try {
      const [suppliersRes, productsRes] = await Promise.all([
        api.get('/suppliers?status=Approved'),
        api.get('/products?status=active')
      ]);
      setSuppliers(suppliersRes.data.filter(s => s.status === 'Approved'));
      setAllProducts(productsRes.data.filter(p => p.status === 'active'));
    } catch (err) {
      toast.error('Failed to load data for form.');
    } finally {
      setModalLoading(false);
    }
  };

  // Effect to fetch POs/Deliveries when supplier changes
  useEffect(() => {
    if (selectedSupplier && isModalOpen) {
      const fetchOrders = async () => {
        setIsOrderLoading(true);
        try {
          const orders = await getSupplierCompletedOrders(selectedSupplier._id);
          setCompletedOrders(orders);
        } catch (err) {
          toast.error('Failed to load supplier order history.');
        } finally {
          setIsOrderLoading(false);
        }
      };
      fetchOrders();
    } else {
      setCompletedOrders([]);
      setSelectedOrder(null);
    }
  }, [selectedSupplier, isModalOpen]);

  // useMemo to get the correct list of products
  const availableProducts = useMemo(() => {
    let sourceProducts = allProducts;
    if (selectedOrder && selectedOrder.items) {
      sourceProducts = selectedOrder.items.map(item => item.product).filter(Boolean);
    }
    // Filter out products already in the return list
    const addedProductIds = new Set(itemsToReturn.map(item => item.product._id));
    return sourceProducts.filter(p => !addedProductIds.has(p._id));
  }, [selectedOrder, allProducts, itemsToReturn]);

  // --- MODIFIED: Reset all states for the add item bar ---
  const resetAddItemBar = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setReason('Defective');
    setWasConsigned(false);
    setMaxQuantity(Infinity);
  };
  
  const openModal = () => {
    setSelectedSupplier(null);
    setItemsToReturn([]); // Clear the table
    setNotes('');
    resetAddItemBar(); // Reset the add item bar
    setIsModalOpen(true);
    fetchModalData();
  };

  // --- MODIFIED: handleProductSelect for the new bar ---
  const handleProductSelect = (newValue) => {
    setSelectedProduct(newValue);

    if (!newValue) {
      resetAddItemBar();
      return;
    }

    // Set max quantity
    let maxQty = Infinity;
    if (selectedOrder) {
      const orderItem = selectedOrder.items.find(i => i.product._id === newValue._id);
      maxQty = orderItem ? orderItem.quantity : 0;
    }
    setMaxQuantity(maxQty);
    if (quantity > maxQty) setQuantity(maxQty);

    // Auto-check "Consigned"
    const productData = allProducts.find(p => p._id === newValue._id);
    if (productData) {
      const ownedStock = (productData.quantity || 0) - (productData.consignedStock || 0);
      if (ownedStock <= 0 && productData.consignedStock > 0) {
        setWasConsigned(true);
        toast.info(`${productData.name} is only available in consigned stock.`, { autoClose: 2000 });
      } else {
        setWasConsigned(false);
      }
    }
  };

  // --- MODIFIED: handleAddItem for the new bar ---
  const handleAddItem = () => {
    if (!selectedProduct) {
      toast.warn('Please select a product.');
      return;
    }
    if (quantity <= 0) {
      toast.warn('Quantity must be greater than 0.');
      return;
    }
    if (quantity > maxQuantity) {
      toast.error(`Quantity exceeds the max returnable amount of ${maxQuantity} from this order.`);
      return;
    }

    setItemsToReturn([...itemsToReturn, { 
      product: selectedProduct, 
      quantity: Number(quantity), 
      reason: reason, 
      wasConsigned: wasConsigned,
      maxQuantity: maxQuantity // Store this for validation on submit
    }]);
    
    resetAddItemBar(); // Reset the bar
  };
  // --- END MODIFICATION ---

  const handleRemoveItem = (productId) => {
    setItemsToReturn(itemsToReturn.filter((item) => item.product._id !== productId));
  };

  const handleSubmitReturn = async () => {
    if (!selectedSupplier) {
      toast.warn('Please select a supplier.');
      return;
    }
    if (itemsToReturn.length === 0) {
      toast.warn('Please add at least one item to the return list.');
      return;
    }
    
    // Final validation check (should be redundant, but good practice)
    const invalidQtyItem = itemsToReturn.find(item => item.quantity > item.maxQuantity);
    if (invalidQtyItem) {
      toast.error(`Quantity for ${invalidQtyItem.product.name} exceeds the max returnable amount.`);
      return;
    }

    try {
      await confirm('This will log the return and decrease your stock quantities for the selected items. This action cannot be undone. Proceed?');

      setModalLoading(true);
      const payload = {
        supplier: selectedSupplier._id,
        productsReturned: itemsToReturn.map(item => ({
          product: item.product._id, // Send only ID
          quantity: item.quantity,
          reason: item.reason,
          wasConsigned: item.wasConsigned || false
        })),
        notes,
        originalPurchaseId: selectedOrder ? selectedOrder._id : undefined,
        originalPurchaseType: selectedOrder ? selectedOrder.type : undefined
      };

      await api.post('/supplier-returns', payload);
      toast.success('Supplier return logged successfully!');
      setIsModalOpen(false);
      fetchReturns();
    } catch (err) {
      if (err) { 
        let errMsg = err.response?.data?.message || 'Failed to log return.';
        toast.error(errMsg);
      }
    } finally {
      setModalLoading(false);
    }
  };
  
  // (columns definition is unchanged)
  const columns = [
    { 
      field: 'date',
      headerName: 'Return Date', 
      width: 150,
      valueGetter: (value, row) => {
        const date = row.returnDate || row.createdAt;
        return date ? new Date(date) : null;
      },
      renderCell: (params) => params.value ? params.value.toLocaleString() : 'N/A' 
    },
    { 
      field: 'supplier', 
      headerName: 'Supplier', 
      flex: 1,
      valueGetter: (value, row) => row.supplier?.name || 'N/A'
    },
    { 
      field: 'productsReturned', 
      headerName: 'Items Returned', 
      flex: 2,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ py: 1 }}>
          {params.row.productsReturned.map(item => (
            <Typography 
              key={item._id} 
              variant="body2" 
              sx={{ whiteSpace: 'normal' }} 
              component="div" 
            >
              {item.quantity}x {item.product?.name || 'Unknown Product'} ({item.reason})
              {item.wasConsigned && (
                <Chip label="Consigned" size="small" color="info" sx={{ ml: 1 }} />
              )}
            </Typography>
          ))}
        </Box>
      )
    },
    { 
      field: 'notes', 
      headerName: 'Notes', 
      flex: 1, 
      sortable: false 
    },
    { 
      field: 'recordedBy', 
      headerName: 'Recorded By', 
      width: 180,
      valueGetter: (value, row) => row.recordedBy?.fullName || 'N/A'
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ p: 3, mt: 2 }}>
      {/* --- MODAL FOR LOGGING A NEW RETURN --- */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>Log New Return to Supplier</DialogTitle>
        <DialogContent>
          {modalLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box component="form" sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                
                <Grid item size={{ xs: 12, sm: 6 }}>
                  <Autocomplete
                    options={suppliers}
                    getOptionLabel={(option) => option.name || ''}
                    value={selectedSupplier}
                    onChange={(e, newValue) => {
                      setSelectedSupplier(newValue);
                      setSelectedOrder(null); 
                      setItemsToReturn([]); // Clear table
                      resetAddItemBar(); // Reset form bar
                    }}
                    renderInput={(params) => <TextField {...params} label="Select Supplier" />}
                  />
                </Grid>
                
                <Grid item size={{ xs: 12, sm: 6 }}>
                  <Autocomplete
                    options={completedOrders}
                    getOptionLabel={(option) => option.name || ''}
                    value={selectedOrder}
                    loading={isOrderLoading}
                    disabled={!selectedSupplier}
                    onChange={(e, newValue) => {
                      setSelectedOrder(newValue);
                      setItemsToReturn([]); // Clear table
                      resetAddItemBar(); // Reset form bar
                    }}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        label="Return from Order (Optional)"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {isOrderLoading ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                  <FormHelperText>Select an order to filter the product list.</FormHelperText>
                </Grid>

                {/* --- NEW: "Add Item" Bar (copied from CreatePurchaseOrderPage) --- */}
                <Grid item size={{ xs: 12 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Add Items to Return
                  </Typography>
                </Grid>

                <Grid item size={{ xs: 12 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item size={{ xs: 12, sm: 3 }}>
                      <Autocomplete
                        options={availableProducts}
                        getOptionLabel={(option) => `${option.name} (${option.itemCode})` || ''}
                        value={selectedProduct}
                        disabled={!selectedSupplier}
                        onChange={(e, newValue) => handleProductSelect(newValue)}
                        renderInput={(params) => <TextField {...params} label="Select Product" size="small" />}
                      />
                    </Grid>
                    <Grid item size={{ xs: 6, sm: 2 }}>
                      <TextField
                        label="Quantity"
                        type="number"
                        size="small"
                        value={quantity}
                        onChange={(e) => {
                          const newQty = parseInt(e.target.value, 10) || 1;
                          if (newQty > maxQuantity) {
                            toast.warn(`Max quantity is ${maxQuantity}`);
                            setQuantity(maxQuantity);
                          } else {
                            setQuantity(newQty);
                          }
                        }}
                        // fullWidth
                        // inputProps={{ min: 1, max: maxQuantity }}
                        // helperText={maxQuantity !== Infinity ? `Max: ${maxQuantity}` : ''}
                      />
                    </Grid>
                    <Grid item size={{ xs: 6, sm: 2 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Reason</InputLabel>
                        <Select
                          label="Reason"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        >
                          <MenuItem value="Defective">Defective</MenuItem>
                          <MenuItem value="Wrong Item">Wrong Item</MenuItem>
                          <MenuItem value="Overstock">Overstock</MenuItem>
                          <MenuItem value="Other">Other</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item size={{ xs: 6, sm: 3 }}>
                      {/* --- MODIFIED: Added Tooltip --- */}
                      <Tooltip 
                        title="Check this if the item being returned is from consignment stock (stock you haven't paid for yet). This will decrease both your total stock and your consigned stock count."
                        arrow
                      >
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={wasConsigned}
                              onChange={(e) => setWasConsigned(e.target.checked)}
                              disabled={!selectedProduct}
                            />
                          }
                          label="Consigned?"
                          sx={{ height: '100%' }}
                        />
                      </Tooltip>
                      {/* --- END MODIFICATION --- */}
                    </Grid>
                    <Grid item size={{ xs: 6, sm: 2 }}>
                      <Button
                        variant="contained"
                        startIcon={<AddCircleOutlineIcon />}
                        onClick={handleAddItem}
                        disabled={!selectedProduct || quantity <= 0}
                        fullWidth
                        sx={{ height: '40px' }}
                      >
                        Add
                      </Button>
                    </Grid>
                  </Grid>
                </Grid>
                {/* --- END "Add Item" Bar --- */}

                {/* --- NEW: Table for "Items to Return" --- */}
                <Grid item size={{ xs: 12 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Items to Return
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell>Reason</TableCell>
                          <TableCell>Consigned</TableCell>
                          <TableCell align="right">Quantity</TableCell>
                          <TableCell align="center">Remove</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {itemsToReturn.map((item, index) => (
                          <TableRow key={item.product._id}>
                            <TableCell>{item.product.name}</TableCell>
                            <TableCell>{item.reason}</TableCell>
                            <TableCell>{item.wasConsigned ? 'Yes' : 'No'}</TableCell>
                            <TableCell align="right">{item.quantity}</TableCell>
                            <TableCell align="center">
                              <IconButton onClick={() => handleRemoveItem(item.product._id)} color="error" size="small">
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                        {itemsToReturn.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} align="center">No items added yet.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                {/* --- END NEW TABLE --- */}

                <Grid item size={{ xs: 12 }}>
                  <TextField
                    label="Notes (Optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    fullWidth
                    multiline
                    rows={3}
                    sx={{ mt: 1 }}
                  />
                </Grid>

              </Grid>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setIsModalOpen(false)} disabled={modalLoading}>Cancel</Button>
          <Button onClick={handleSubmitReturn} variant="contained" disabled={modalLoading}>
            {modalLoading ? <CircularProgress size={24} /> : 'Submit Return'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- MAIN PAGE CONTENT --- */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Supplier Returns
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openModal}>
          Log New Return
        </Button>
      </Box>

      <Paper sx={{ height: '75vh', width: ' 100%' }}>
        <DataGrid
          rows={returns}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row._id}
          getRowHeight={() => 'auto'}
          sx={{
            '& .MuiDataGrid-cell': {
              py: 1.5
            }
          }}
          initialState={{
            sorting: { sortModel: [{ field: 'date', sort: 'desc' }] },
          }}
        />
      </Paper>
    </Container>
  );
};

export default SupplierReturnsPage;