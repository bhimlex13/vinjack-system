// client/src/pages/SupplierReturnsPage.js
import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import ConfirmationContext from '../context/ConfirmationContext';
import { getSupplierCompletedOrders } from '../api/supplierApi';
import { motion, AnimatePresence } from 'framer-motion'; 
// --- MODIFIED: Date Imports ---
import { startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';
// --- END MODIFICATION ---

import {
  Container, Typography, Button, Box, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, TextField, Autocomplete,
  IconButton, CircularProgress, Tooltip, FormControl, InputLabel, Select, MenuItem,
  Checkbox, FormControlLabel, Chip,
  FormHelperText,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  ButtonGroup // --- MODIFIED: Added ButtonGroup ---
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'; 

import LoadingSpinner from '../components/LoadingSpinner';

const SupplierReturnsPage = () => {
  const today = new Date().toISOString().split('T')[0]; // --- NEW ---

  const [returns, setReturns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { confirm } = useContext(ConfirmationContext);

  // --- MODIFIED: Date Filter State ---
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [datePreset, setDatePreset] = useState('today');
  // --- END MODIFICATION ---

  // Modal State
  const [modalLoading, setModalLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [allProducts, setAllProducts] = useState([]); 
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [notes, setNotes] = useState('');
  
  const [completedOrders, setCompletedOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOrderLoading, setIsOrderLoading] = useState(false);

  const [itemsToReturn, setItemsToReturn] = useState([]); 
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('Defective');
  const [wasConsigned, setWasConsigned] = useState(false);
  const [maxQuantity, setMaxQuantity] = useState(Infinity);

  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };

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

  // --- MODIFIED: Date Preset Handler ---
  const handleDatePreset = (preset) => {
    const now = new Date();
    let start = now;
    let end = now;
    setDatePreset(preset);

    if (preset === 'today') {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (preset === 'week') {
      start = startOfWeek(now);
      end = endOfDay(now);
    } else if (preset === 'month') {
      start = startOfMonth(now);
      end = endOfDay(now);
    } else if (preset === 'year') {
      start = startOfYear(now);
      end = endOfDay(now);
    } else if (preset === 'all') {
      start = new Date(0); // Epoch start
      end = endOfDay(now);
    }

    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };
  // --- END MODIFICATION ---

  // --- MODIFIED: Filter Returns by Date ---
  const filteredReturns = useMemo(() => {
    return returns.filter(row => {
      const rowDate = new Date(row.returnDate || row.createdAt);
      
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      return rowDate >= start && rowDate <= end;
    });
  }, [returns, startDate, endDate]);
  // --- END MODIFICATION ---

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

  const availableProducts = useMemo(() => {
    let sourceProducts = allProducts;
    if (selectedOrder && selectedOrder.items) {
      sourceProducts = selectedOrder.items.map(item => item.product).filter(Boolean);
    }
    const addedProductIds = new Set(itemsToReturn.map(item => item.product._id));
    return sourceProducts.filter(p => !addedProductIds.has(p._id));
  }, [selectedOrder, allProducts, itemsToReturn]);

  const resetAddItemBar = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setReason('Defective');
    setWasConsigned(false);
    setMaxQuantity(Infinity);
  };
  
  const openModal = () => {
    setSelectedSupplier(null);
    setItemsToReturn([]); 
    setNotes('');
    resetAddItemBar(); 
    setIsModalOpen(true);
    fetchModalData();
  };

  const handleProductSelect = (newValue) => {
    setSelectedProduct(newValue);

    if (!newValue) {
      resetAddItemBar();
      return;
    }

    let maxQty = Infinity;
    if (selectedOrder) {
      const orderItem = selectedOrder.items.find(i => i.product._id === newValue._id);
      maxQty = orderItem ? orderItem.quantity : 0;
    }
    setMaxQuantity(maxQty);
    if (quantity > maxQty) setQuantity(maxQty);

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
      maxQuantity: maxQuantity 
    }]);
    
    resetAddItemBar(); 
  };

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
          product: item.product._id, 
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

  if (isLoading && returns.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <LoadingSpinner text="Loading Returns..." />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ p: 3, mt: 2 }}>
      
      <AnimatePresence>
        {isModalOpen && (
          <Dialog 
            open={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            fullWidth 
            maxWidth="lg"
            PaperComponent={motion.div}
            PaperProps={{
              initial: { y: 50, opacity: 0 },
              animate: { y: 0, opacity: 1 },
              exit: { y: 50, opacity: 0 },
              transition: { duration: 0.3 },
              sx: { backgroundColor: 'background.paper', boxShadow: 24, borderRadius: 2 }
            }}
          >
            <DialogTitle>Log New Return to Supplier</DialogTitle>
            <DialogContent>
              {modalLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                  <LoadingSpinner text="Preparing Form..." />
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
                          setItemsToReturn([]); 
                          resetAddItemBar(); 
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
                          setItemsToReturn([]); 
                          resetAddItemBar(); 
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
                          <Tooltip 
                            title="Check this if the item being returned is from consignment stock."
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
                          <TableBody component={AnimatePresence}>
                            {itemsToReturn.map((item, index) => (
                              <TableRow 
                                key={item.product._id}
                                component={motion.tr}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                              >
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
                {modalLoading ? <LoadingSpinner text="" /> : 'Submit Return'}
              </Button>
            </DialogActions>
          </Dialog>
        )}
      </AnimatePresence>

      {/* --- MAIN PAGE CONTENT --- */}
      <motion.div initial="hidden" animate="visible" variants={pageVariants}>
        
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            Supplier Returns
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openModal}>
            Log New Return
          </Button>
        </Box>

        {/* --- MODIFIED: Date Filter Paper --- */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item size={{ xs: 12 }}>
              <ButtonGroup fullWidth variant="outlined" aria-label="date range presets">
                <Button variant={datePreset === 'today' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('today')}>Today</Button>
                <Button variant={datePreset === 'week' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('week')}>This Week</Button>
                <Button variant={datePreset === 'month' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('month')}>This Month</Button>
                <Button variant={datePreset === 'year' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('year')}>This Year</Button>
                <Button variant={datePreset === 'all' ? 'contained' : 'outlined'} onClick={() => handleDatePreset('all')}>All Time</Button>
              </ButtonGroup>
            </Grid>
            <Grid item size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
            </Grid>
            <Grid item size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
            </Grid>
          </Grid>
        </Paper>
        {/* --- END MODIFICATION --- */}

        <Paper sx={{ height: '75vh', width: ' 100%' }}>
          <DataGrid
            rows={filteredReturns} // --- MODIFIED: Using filteredReturns ---
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
      </motion.div>
    </Container>
  );
};

export default SupplierReturnsPage;