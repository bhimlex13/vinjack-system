// client/src/pages/SupplierReturnsPage.js
import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import ConfirmationContext from '../context/ConfirmationContext';
import { getSupplierCompletedOrders } from '../api/supplierApi';
import { motion, AnimatePresence } from 'framer-motion'; 
import { startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';

import {
  Container, Typography, Button, Box, Paper, Dialog, DialogTitle,
  DialogContent, Grid, TextField, Autocomplete,
  IconButton, CircularProgress, Tooltip, FormControl, InputLabel, Select, MenuItem,
  Checkbox, FormControlLabel, Chip,
  FormHelperText,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  ButtonGroup, Divider, Stack
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'; 
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import RefreshIcon from '@mui/icons-material/Refresh';

import LoadingSpinner from '../components/LoadingSpinner';

const SupplierReturnsPage = () => {
  const today = new Date().toISOString().split('T')[0];

  const [returns, setReturns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { confirm } = useContext(ConfirmationContext);

  // --- Date Filter State ---
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [datePreset, setDatePreset] = useState('today');

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

  // --- Date Preset Handler ---
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

  // --- Filter Logic ---
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
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={600}>
            {params.value ? params.value.toLocaleDateString() : 'N/A'}
        </Typography>
      )
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
              sx={{ whiteSpace: 'normal', mb: 0.5, lineHeight: 1.3 }} 
              component="div" 
            >
              <strong>{item.quantity}x</strong> {item.product?.name || 'Unknown Product'} 
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                ({item.reason})
              </Typography>
              {item.wasConsigned && (
                <Chip label="Consigned" size="small" color="info" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
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
              initial: { y: 20, opacity: 0, scale: 0.95 },
              animate: { y: 0, opacity: 1, scale: 1 },
              exit: { y: 20, opacity: 0, scale: 0.95 },
              transition: { duration: 0.2 },
              sx: { 
                borderRadius: 3, 
                overflow: 'hidden',
                bgcolor: 'background.paper', 
                boxShadow: 24 
              }
            }}
          >
            <DialogTitle sx={{ bgcolor: 'error.main', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssignmentReturnIcon /> Log New Return to Supplier
            </DialogTitle>
            <DialogContent>
              {modalLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                  <LoadingSpinner text="Preparing Form..." />
                </Box>
              ) : (
                <Box component="form" sx={{ mt: 3 }}>
                  <Grid container spacing={3}>
                    
                    <Grid size={{ xs: 12, sm: 6 }}>
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
                        renderInput={(params) => <TextField {...params} label="Select Supplier" variant="outlined" />}
                      />
                    </Grid>
                    
                    <Grid size={{ xs: 12, sm: 6 }}>
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

                    <Grid size={{ xs: 12 }}>
                        <Divider textAlign="left"><Chip label="Add Items" size="small" /></Divider>
                    </Grid>

                    {/* Add Item Bar */}
                    <Grid size={{ xs: 12 }}>
                        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                            <Grid container spacing={2} alignItems="flex-start">
                                <Grid size={{ xs: 12, md: 4 }}>
                                <Autocomplete
                                    options={availableProducts}
                                    getOptionLabel={(option) => `${option.name} (${option.itemCode})` || ''}
                                    value={selectedProduct}
                                    disabled={!selectedSupplier}
                                    onChange={(e, newValue) => handleProductSelect(newValue)}
                                    renderInput={(params) => <TextField {...params} label="Select Product" size="small" />}
                                />
                                </Grid>
                                <Grid size={{ xs: 6, md: 2 }}>
                                <TextField
                                    label="Quantity"
                                    type="number"
                                    size="small"
                                    fullWidth
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
                                <Grid size={{ xs: 6, md: 2 }}>
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
                                <Grid size={{ xs: 6, md: 2 }}>
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
                                    sx={{ height: '100%', ml: 1, span: { fontSize: '0.85rem' } }}
                                    />
                                </Tooltip>
                                </Grid>
                                <Grid size={{ xs: 12, md: 2 }}>
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
                        </Paper>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ mt: 1 }}>
                        Items to Return ({itemsToReturn.length})
                      </Typography>
                      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 250, borderRadius: 2 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                              <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Consigned</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600 }}>Quantity</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 600 }}>Action</TableCell>
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
                                hover
                              >
                                <TableCell>{item.product.name}</TableCell>
                                <TableCell>{item.reason}</TableCell>
                                <TableCell>
                                    {item.wasConsigned ? <Chip label="Yes" color="info" size="small" /> : 'No'}
                                </TableCell>
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
                                <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>No items added yet.</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
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

            {/* Modal Actions - Responsive */}
            <Grid container spacing={2} sx={{ p: 3, bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'divider' }}>
                <Grid size={{ xs: 12, sm: 'auto' }} sx={{ ml: { sm: 'auto' }, order: { xs: 2, sm: 1 } }}>
                    <Button onClick={() => setIsModalOpen(false)} disabled={modalLoading} variant="outlined" color="inherit" fullWidth>
                        Cancel
                    </Button>
                </Grid>
                <Grid size={{ xs: 12, sm: 'auto' }} sx={{ order: { xs: 1, sm: 2 } }}>
                    <Button onClick={handleSubmitReturn} variant="contained" disabled={modalLoading} color="error" fullWidth>
                        {modalLoading ? <CircularProgress size={24} color="inherit" /> : 'Submit Return'}
                    </Button>
                </Grid>
            </Grid>
          </Dialog>
        )}
      </AnimatePresence>

      {/* --- MAIN PAGE CONTENT --- */}
      <motion.div initial="hidden" animate="visible" variants={pageVariants}>
        
        {/* Header - Responsive */}
        <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'error.light', color: 'error.dark', display: 'flex' }}>
                <AssignmentReturnIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={700}>Supplier Returns</Typography>
                <Typography variant="body2" color="text.secondary">Track items returned to suppliers</Typography>
              </Box>
          </Stack>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={openModal} 
            sx={{ borderRadius: 2, fontWeight: 600, px: 3, width: { xs: '100%', sm: 'auto' } }}
          >
            Log New Return
          </Button>
        </Box>

        {/* --- Date Filter --- */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 2 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Scrollable Date Presets */}
            <Grid size={{ xs: 12 }}>
                <Box sx={{ overflowX: 'auto', pb: 0.5, whiteSpace: 'nowrap' }}>
                    <ButtonGroup variant="outlined" aria-label="date range presets" size="small">
                        {['today', 'week', 'month', 'year', 'all'].map((preset) => (
                            <Button 
                                key={preset}
                                variant={datePreset === preset ? 'contained' : 'outlined'} 
                                onClick={() => handleDatePreset(preset)}
                                sx={{ textTransform: 'capitalize', borderRadius: 2 }}
                            >
                                {preset === 'all' ? 'All Time' : preset}
                            </Button>
                        ))}
                    </ButtonGroup>
                </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} size="small" />
            </Grid>
          </Grid>
        </Paper>

        {/* Data Grid */}
        <Paper 
            sx={{ 
                height: '75vh', 
                width: '100%', 
                borderRadius: 3, 
                boxShadow: 3, 
                overflow: 'hidden',
                '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: 'grey.50',
                    fontWeight: 700,
                    fontSize: '0.9rem'
                },
                '& .MuiDataGrid-row:hover': {
                    backgroundColor: 'action.hover'
                },
                '& .MuiDataGrid-cell': {
                    display: 'flex',       
                    alignItems: 'center',  // Vertically align cell content
                    py: 1.5
                }
            }}
        >
            <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end', bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                <Tooltip title="Refresh Data">
                    <IconButton onClick={fetchReturns} size="small">
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
            </Box>
          <DataGrid
            rows={filteredReturns}
            columns={columns}
            loading={isLoading}
            getRowId={(row) => row._id}
            getRowHeight={() => 'auto'}
            initialState={{
              sorting: { sortModel: [{ field: 'date', sort: 'desc' }] },
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
          />
        </Paper>
      </motion.div>
    </Container>
  );
};

export default SupplierReturnsPage;