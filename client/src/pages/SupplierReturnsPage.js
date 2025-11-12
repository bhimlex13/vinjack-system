// client/src/pages/SupplierReturnsPage.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import AuthContext from '../context/AuthContext';
import ConfirmationContext from '../context/ConfirmationContext';

// MUI Imports
import {
  Container, Typography, Button, Box, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, TextField, Autocomplete,
  IconButton, CircularProgress, Tooltip, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

// Helper component for the modal's item row
const ReturnItemRow = ({ item, index, products, onUpdate, onRemove }) => {
  const product = products.find(p => p._id === item.product) || null;

  return (
    <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
      <Grid item xs={5}>
        <Autocomplete
          options={products}
          getOptionLabel={(option) => `${option.name} (${option.itemCode})` || ''}
          value={product}
          onChange={(e, newValue) => onUpdate(index, 'product', newValue?._id || null)}
          renderInput={(params) => <TextField {...params} label="Select Product" />}
        />
      </Grid>
      <Grid item xs={2}>
        <TextField
          label="Quantity"
          type="number"
          value={item.quantity}
          onChange={(e) => onUpdate(index, 'quantity', parseInt(e.target.value, 10) || 1)}
          fullWidth
          inputProps={{ min: 1 }}
        />
      </Grid>
      <Grid item xs={4}>
        <FormControl fullWidth>
          <InputLabel>Reason</InputLabel>
          <Select
            label="Reason"
            value={item.reason}
            onChange={(e) => onUpdate(index, 'reason', e.target.value)}
          >
            <MenuItem value="Defective">Defective</MenuItem>
            <MenuItem value="Wrong Item">Wrong Item</MenuItem>
            <MenuItem value="Overstock">Overstock</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={1}>
        <Tooltip title="Remove Item">
          <IconButton onClick={() => onRemove(index)} color="error">
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Grid>
    </Grid>
  );
};

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
  const [itemsToReturn, setItemsToReturn] = useState([{ product: null, quantity: 1, reason: 'Defective' }]);
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
        api.get('/suppliers?status=Approved'), // Only load approved suppliers
        api.get('/products') // Load all products
      ]);
      setSuppliers(suppliersRes.data.filter(s => s.status === 'Approved'));
      setProducts(productsRes.data.filter(p => p.status === 'active')); // Only active products
    } catch (err) {
      toast.error('Failed to load data for form.');
    } finally {
      setModalLoading(false);
    }
  };

  const openModal = () => {
    // Reset form state
    setSelectedSupplier(null);
    setItemsToReturn([{ product: null, quantity: 1, reason: 'Defective' }]);
    setNotes('');
    setReturnDate(new Date().toISOString().split('T')[0]);
    
    setIsModalOpen(true);
    fetchModalData(); // Fetch suppliers/products
  };

  const handleAddItem = () => {
    setItemsToReturn([...itemsToReturn, { product: null, quantity: 1, reason: 'Defective' }]);
  };

  const handleRemoveItem = (index) => {
    setItemsToReturn(itemsToReturn.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index, field, value) => {
    const newItems = [...itemsToReturn];
    newItems[index] = { ...newItems[index], [field]: value };
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
        })),
        notes,
        returnDate,
      };

      await api.post('/supplier-returns', payload);
      toast.success('Supplier return logged successfully!');
      setIsModalOpen(false);
      fetchReturns(); // Refresh the list
    } catch (err) {
      // If 'err' is null, it means the user cancelled the confirmation
      if (err) {
        toast.error(err.response?.data?.message || 'Failed to log return.');
      }
    } finally {
      setModalLoading(false);
    }
  };

  const columns = [
    { 
      field: 'returnDate', 
      headerName: 'Return Date', 
      width: 150,
      valueGetter: (params) => new Date(params.row.returnDate).toLocaleDateString()
    },
    { 
      field: 'supplier', 
      headerName: 'Supplier', 
      flex: 1,
      valueGetter: (params) => params.row.supplier?.name || 'N/A'
    },
    { 
      field: 'productsReturned', 
      headerName: 'Items Returned', 
      flex: 2,
      renderCell: (params) => (
        <Box>
          {params.row.productsReturned.map(item => (
            <Typography key={item._id} variant="body2">
              {item.quantity}x {item.product?.name || 'Unknown Product'} ({item.reason})
            </Typography>
          ))}
        </Box>
      )
    },
    { field: 'notes', headerName: 'Notes', flex: 1 },
    { 
      field: 'recordedBy', 
      headerName: 'Recorded By', 
      width: 180,
      valueGetter: (params) => params.row.recordedBy?.fullName || 'N/A'
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ p: 3, mt: 2 }}>
      {/* --- MODAL FOR LOGGING A NEW RETURN --- */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Log New Return to Supplier</DialogTitle>
        <DialogContent>
          {modalLoading ? <CircularProgress /> : (
            <Box component="form" sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                  <Autocomplete
                    options={suppliers}
                    getOptionLabel={(option) => option.name || ''}
                    value={selectedSupplier}
                    onChange={(e, newValue) => setSelectedSupplier(newValue)}
                    renderInput={(params) => <TextField {...params} label="Select Supplier" />}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Return Date"
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
              
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Items to Return</Typography>
              {itemsToReturn.map((item, index) => (
                <ReturnItemRow
                  key={index}
                  item={item}
                  index={index}
                  products={products}
                  onUpdate={handleUpdateItem}
                  onRemove={handleRemoveItem}
                />
              ))}
              <Button onClick={handleAddItem} sx={{ mt: 1 }}>Add Item</Button>
              
              <TextField
                label="Notes (Optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
                multiline
                rows={3}
                sx={{ mt: 3 }}
              />
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
          rowHeight={100} // Set a custom row height to accommodate multiple items
        />
      </Paper>
    </Container>
  );
};

export default SupplierReturnsPage;