// client/src/components/CreateReturnModal.js
import React, { useState, useEffect, useContext } from 'react'; // Added useContext
import { searchSales, getSaleById } from '../api/saleApi';
import { createReturn } from '../api/returnApi';
import { getCustomers } from '../api/customerApi';
import { getUsers } from '../api/userApi';
import { toast } from 'react-toastify';
import ConfirmationContext from '../context/ConfirmationContext'; // Added ConfirmationContext import

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, TextField, Button,
  Typography, CircularProgress, Alert, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, Grid, Autocomplete,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import SearchIcon from '@mui/icons-material/Search';


const CreateReturnModal = ({ open, onClose, onReturnSuccess }) => {
  const { confirm } = useContext(ConfirmationContext); // Added confirm hook
  const [step, setStep] = useState('search');
  
  // Search state
  const [searchSaleId, setSearchSaleId] = useState('');
  const [searchParams, setSearchParams] = useState({ customer: null, user: null, startDate: '', endDate: '' });
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  
  // Process state
  const [saleDetails, setSaleDetails] = useState(null);
  const [itemsToReturn, setItemsToReturn] = useState({});
  const [reason, setReason] = useState('');
  
  // General state
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      const fetchDropdownData = async () => {
        try {
          const [customersData, usersData] = await Promise.all([ getCustomers(), getUsers() ]);
          setCustomers(customersData);
          setUsers(usersData);
        } catch (err) {
          toast.error("Failed to load search data.");
        }
      };
      fetchDropdownData();
    }
  }, [open]);

  const resetState = () => {
    setStep('search');
    setSearchSaleId('');
    setSearchParams({ customer: null, user: null, startDate: '', endDate: '' });
    setSearchResults([]);
    setSaleDetails(null);
    setItemsToReturn({});
    setReason('');
    setError('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSearch = async () => {
    setStep('loading');
    setError('');
    try {
      let data;
      if (searchSaleId.trim()) {
        const sale = await getSaleById(searchSaleId.trim());
        data = sale ? [sale] : [];
      } else {
        const params = {
            customerId: searchParams.customer?._id,
            userId: searchParams.user?._id,
            startDate: searchParams.startDate,
            endDate: searchParams.endDate,
        };
        data = await searchSales(params);
      }
      if (!data || data.length === 0) {
        toast.info("No sales found matching your criteria.");
        setStep('search');
        return;
      }
      setSearchResults(data);
      setStep('results');
    } catch (err) {
      toast.error('Sale not found or an error occurred during search.');
      setStep('search');
    }
  };

  const handleSelectSale = async (sale) => {
    setStep('loading');
    try {
      const fullSaleDetails = await getSaleById(sale._id);
      setSaleDetails(fullSaleDetails);
      const initialItems = {};
      fullSaleDetails.items.forEach(item => {
        if (item.product && item.product._id) {
          initialItems[item.product._id] = 0;
        }
      });
      setItemsToReturn(initialItems);
      setStep('process');
    } catch (err) {
      toast.error('Failed to fetch full sale details.');
      setStep('results');
    }
  };
  
  const handleQuantityChange = (productId, amount) => {
    const soldItem = saleDetails.items.find(i => i.product._id === productId);
    if (!soldItem) return;
    setItemsToReturn(prev => {
        const currentQty = prev[productId] || 0;
        const newQty = currentQty + amount;
        if (newQty >= 0 && newQty <= soldItem.quantity) {
            return { ...prev, [productId]: newQty };
        }
        return prev;
    });
  };

  const handleProcessReturn = async () => {
    const returnPayload = {
        originalSaleId: saleDetails._id,
        reason,
        itemsReturned: Object.entries(itemsToReturn)
            .filter(([_, qty]) => qty > 0)
            .map(([productId, qty]) => ({ product: productId, quantity: qty })),
    };

    if (returnPayload.itemsReturned.length === 0) {
        toast.warn('You must select at least one item to return.');
        return;
    }
    if (!reason.trim()) {
        toast.warn('A reason for the return is required.');
        return;
    }
    
    // --- ADDED: Calculate refund and show confirmation ---
    const totalRefund = returnPayload.itemsReturned.reduce((acc, returnedItem) => {
      const originalItem = saleDetails.items.find(i => i.product._id === returnedItem.product);
      return acc + (originalItem.priceAtTime * returnedItem.quantity);
    }, 0);

    const isConfirmed = await confirm(
      `Process return for a refund of ₱${totalRefund.toFixed(2)}? This will add stock back to inventory.`
    );

    if (isConfirmed) {
      setStep('loading');
      try {
          await createReturn(returnPayload);
          toast.success('Return processed successfully!');
          onReturnSuccess();
          handleClose();
      } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to process return.');
          setStep('process');
      }
    }
  };

  const renderContent = () => {
    if (step === 'loading') {
      return <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>;
    }

    if (step === 'search') {
      return (
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Search by Exact Sales ID"
              value={searchSaleId}
              onChange={(e) => setSearchSaleId(e.target.value)}
            />
          </Grid>
          <Grid item size={{ xs: 12 }}><Divider>OR</Divider></Grid>
          <Grid item size={{ xs: 12 }}>
            <Autocomplete
              options={customers}
              getOptionLabel={(option) => option.name}
              value={searchParams.customer}
              onChange={(e, value) => setSearchParams(prev => ({...prev, customer: value}))}
              renderInput={(params) => <TextField {...params} label="Filter by Customer" />}
            />
          </Grid>
          <Grid item size={{ xs: 12 }}>
            <Autocomplete
              options={users}
              getOptionLabel={(option) => option.fullName}
              value={searchParams.user}
              onChange={(e, value) => setSearchParams(prev => ({...prev, user: value}))}
              renderInput={(params) => <TextField {...params} label="Filter by Cashier" />}
            />
          </Grid>
          <Grid item size={{ xs: 6 }}>
            <TextField type="date" label="Start Date" value={searchParams.startDate} onChange={(e) => setSearchParams(prev => ({...prev, startDate: e.target.value}))} InputLabelProps={{ shrink: true }} fullWidth />
          </Grid>
          <Grid item size={{ xs: 6 }}>
            <TextField type="date" label="End Date" value={searchParams.endDate} onChange={(e) => setSearchParams(prev => ({...prev, endDate: e.target.value}))} InputLabelProps={{ shrink: true }} fullWidth />
          </Grid>
        </Grid>
      );
    }
    
    if (step === 'results') {
        return (
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead><TableRow><TableCell>Sale Date</TableCell><TableCell>Customer</TableCell><TableCell align="right">Total</TableCell><TableCell align="center">Action</TableCell></TableRow></TableHead>
                    <TableBody>
                        {searchResults.map(sale => (
                            <TableRow key={sale._id} hover>
                                <TableCell>{new Date(sale.createdAt).toLocaleString()}</TableCell>
                                <TableCell>{sale.customer?.name || 'N/A'}</TableCell>
                                <TableCell align="right">₱{sale.totalAmount.toFixed(2)}</TableCell>
                                <TableCell align="center"><Button size="small" onClick={() => handleSelectSale(sale)}>Select</Button></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    }

    if (step === 'process' && saleDetails) {
      return (
        <Box>
          <Typography variant="body2">ID: {saleDetails._id}</Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>Customer: {saleDetails.customer?.name || 'N/A'}</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead><TableRow><TableCell>Product</TableCell><TableCell align="center">Sold</TableCell><TableCell align="center">Return Qty</TableCell></TableRow></TableHead>
              <TableBody>
                {saleDetails.items.map(item => (
                  <TableRow key={item.product?._id}>
                    <TableCell>{item.product?.name || 'Product not found'}</TableCell>
                    <TableCell align="center">{item.quantity}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconButton size="small" onClick={() => handleQuantityChange(item.product._id, -1)}><RemoveIcon fontSize="small"/></IconButton>
                          <Typography sx={{ mx: 1 }}>{itemsToReturn[item.product._id]}</Typography>
                          <IconButton size="small" onClick={() => handleQuantityChange(item.product._id, 1)}><AddIcon fontSize="small"/></IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TextField label="Reason for Return *" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth multiline rows={2} required sx={{ mt: 2 }}/>
        </Box>
      );
    }
    return <Alert severity="error">An unexpected error occurred. Please try again.</Alert>;
  };
  
  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Process New Return</DialogTitle>
      <DialogContent>{renderContent()}</DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {step === 'search' && <Button onClick={handleSearch} variant="contained" startIcon={<SearchIcon />}>Search Sales</Button>}
        {step === 'results' && <Button onClick={() => setStep('search')}>Back to Search</Button>}
        {step === 'process' && <Button onClick={() => setStep('results')}>Back to Results</Button>}
        {step === 'process' && <Button onClick={handleProcessReturn} variant="contained" color="success">Process Return</Button>}
      </DialogActions>
    </Dialog>
  );
};

export default CreateReturnModal;