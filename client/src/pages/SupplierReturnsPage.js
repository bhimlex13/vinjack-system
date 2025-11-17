// client/src/pages/SupplierReturnsPage.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import AuthContext from '../context/AuthContext';
import ConfirmationContext from '../context/ConfirmationContext';

import {
  Container, Typography, Button, Box, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, TextField, Autocomplete,
  IconButton, CircularProgress, Tooltip, FormControl, InputLabel, Select, MenuItem,
  Checkbox, FormControlLabel, Chip,
  List,
  ListItem,
  Divider,
  FormHelperText
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
  const [products, setProducts] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [itemsToReturn, setItemsToReturn] = useState([{ product: null, quantity: 1, reason: 'Defective', wasConsigned: false }]);
  const [notes, setNotes] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);

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
    try {
      const [suppliersRes, productsRes] = await Promise.all([
        api.get('/suppliers?status=Approved'),
        api.get('/products?status=active')
      ]);
      setSuppliers(suppliersRes.data.filter(s => s.status === 'Approved'));
      setProducts(productsRes.data.filter(p => p.status === 'active'));
    } catch (err) {
      toast.error('Failed to load data for form.');
    } finally {
      setModalLoading(false);
    }
  };

  const openModal = () => {
    setSelectedSupplier(null);
    setItemsToReturn([{ product: null, quantity: 1, reason: 'Defective', wasConsigned: false }]);
    setNotes('');
    setReturnDate(new Date().toISOString().split('T')[0]);
    
    setIsModalOpen(true);
    fetchModalData();
  };

  const handleAddItem = () => {
    setItemsToReturn([...itemsToReturn, { product: null, quantity: 1, reason: 'Defective', wasConsigned: false }]);
  };

  const handleRemoveItem = (index) => {
    setItemsToReturn(itemsToReturn.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index, field, value) => {
    const newItems = [...itemsToReturn];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'product' && value) {
      const product = products.find(p => p._id === value);
      if (product) {
        const ownedStock = (product.quantity || 0) - (product.consignedStock || 0);
        if (ownedStock <= 0 && product.consignedStock > 0) {
          newItems[index].wasConsigned = true;
          toast.info(`${product.name} is only available in consigned stock.`, { autoClose: 2000 });
        } else {
          newItems[index].wasConsigned = false;
        }
      }
    }
    
    setItemsToReturn(newItems);
  };

  const handleSubmitReturn = async () => {
    if (!selectedSupplier) {
      toast.warn('Please select a supplier.');
      return;
    }
    if (itemsToReturn.some(item => !item.product || item.quantity <= 0)) {
      toast.warn('Please ensure all items have a product and a valid quantity.');
      return;
    }

    try {
      await confirm({
        title: 'Confirm Supplier Return',
        description: 'This will log the return and decrease your stock quantities for the selected items. This action cannot be undone. Proceed?'
      });

      setModalLoading(true);
      const payload = {
        supplier: selectedSupplier._id,
        productsReturned: itemsToReturn.map(item => ({
          product: item.product,
          quantity: item.quantity,
          reason: item.reason,
          wasConsigned: item.wasConsigned || false
        })),
        notes,
        returnDate,
      };

      await api.post('/supplier-returns', payload);
      toast.success('Supplier return logged successfully!');
      setIsModalOpen(false);
      fetchReturns();
    } catch (err) {
      if (err) {
        let errMsg = err.response?.data?.message || 'Failed to log return.';
        if (errMsg.includes('consigned stock')) {
          toast.error(errMsg, { autoClose: 5000 });
        } else {
          toast.error(errMsg);
        }
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
      renderCell: (params) => params.value ? params.value.toLocaleDateString() : 'N/A'
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
            <Typography key={item._id} variant="body2" sx={{ whiteSpace: 'normal' }}>
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
              {/* --- SYNTAX CHANGED TO 'size={{...}}' --- */}
              <Grid container spacing={2}>
                
                <Grid item size={{ xs: 12, sm: 8 }}>
                  <Autocomplete
                    options={suppliers}
                    getOptionLabel={(option) => option.name || ''}
                    value={selectedSupplier}
                    onChange={(e, newValue) => setSelectedSupplier(newValue)}
                    renderInput={(params) => <TextField {...params} label="Select Supplier" />}
                  />
                </Grid>
                <Grid item size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Return Date"
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item size={{ xs: 12 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Items to Return
                  </Typography>
                </Grid>

                <Grid item size={{ xs: 12 }}>
                  <Paper variant="outlined">
                    <List dense disablePadding>
                      {itemsToReturn.map((item, index) => {
                        const product = products.find(p => p._id === item.product) || null;
                        return (
                          <React.Fragment key={index}>
                            <ListItem sx={{ p: 2 }}>
                              <Grid container spacing={2} alignItems="center">
                                <Grid item size={{ xs: 12, sm: 4 }}>
                                  <Autocomplete
                                    options={products}
                                    getOptionLabel={(option) => `${option.name} (${option.itemCode})` || ''}
                                    value={product}
                                    onChange={(e, newValue) => handleUpdateItem(index, 'product', newValue?._id || null)}
                                    renderInput={(params) => <TextField {...params} label="Select Product" size="small" />}
                                  />
                                </Grid>
                                <Grid item size={{ xs: 6, sm: 2 }}>
                                  <TextField
                                    label="Quantity"
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value, 10) || 1)}
                                    fullWidth
                                    inputProps={{ min: 1 }}
                                    size="small"
                                  />
                                </Grid>
                                <Grid item size={{ xs: 6, sm: 3 }}>
                                  <FormControl fullWidth size="small">
                                    <InputLabel>Reason</InputLabel>
                                    <Select
                                      label="Reason"
                                      value={item.reason}
                                      onChange={(e) => handleUpdateItem(index, 'reason', e.target.value)}
                                    >
                                      <MenuItem value="Defective">Defective</MenuItem>
                                      <MenuItem value="Wrong Item">Wrong Item</MenuItem>
                                      <MenuItem value="Overstock">Overstock</MenuItem>
                                      <MenuItem value="Other">Other</MenuItem>
                                    </Select>
                                  </FormControl>
                                </Grid>
                                <Grid item size={{ xs: 12, sm: 2 }}>
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        checked={item.wasConsigned}
                                        onChange={(e) => handleUpdateItem(index, 'wasConsigned', e.target.checked)}
                                        disabled={!product}
                                      />
                                    }
                                    label="Consigned?"
                                    sx={{ height: '100%' }}
                                  />
                                </Grid>
                                <Grid item size={{ xs: 12, sm: 1 }} sx={{ textAlign: 'right' }}>
                                  <Tooltip title="Remove Item">
                                    <IconButton onClick={() => handleRemoveItem(index)} color="error">
                                      <DeleteIcon />
                                    </IconButton>
                                  </Tooltip>
                                </Grid>
                              </Grid>
                            </ListItem>
                            {index < itemsToReturn.length - 1 && <Divider component="li" />}
                          </React.Fragment>
                        );
                      })}
                    </List>
                    {itemsToReturn.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                        No items added yet.
                      </Typography>
                    )}
                  </Paper>
                </Grid>
                
                <Grid item size={{ xs: 12 }}>
                  <Button size="small" startIcon={<AddCircleOutlineIcon />} onClick={handleAddItem}>
                    Add Item
                  </Button>
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
              {/* --- END OF SYNTAX CHANGE --- */}
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