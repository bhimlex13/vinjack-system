// client/src/components/CreateReturnModal.js
import React, { useState, useEffect, useContext } from 'react';
import { searchSales, getSaleById } from '../api/saleApi';
import { createReturn, getReturnsBySaleId } from '../api/returnApi'; 
import { getCustomers } from '../api/customerApi';
import { getUsers } from '../api/userApi';
import { toast } from 'react-toastify';
import ConfirmationContext from '../context/ConfirmationContext';
import { motion, AnimatePresence } from 'framer-motion'; // --- NEW IMPORT ---

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, TextField, Button,
  Typography, Alert, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, Grid, Autocomplete,
  Divider,
  Select, MenuItem, FormControl, InputLabel,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import SearchIcon from '@mui/icons-material/Search';

// --- NEW IMPORT ---
import LoadingSpinner from './LoadingSpinner';

const CreateReturnModal = ({ open, onClose, onReturnSuccess }) => {
  const { confirm } = useContext(ConfirmationContext);
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
  const [outcome, setOutcome] = useState('Restocked');
  const [maxReturnableQuantities, setMaxReturnableQuantities] = useState({});

  // --- ANIMATION VARIANTS ---
  const stepVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
  };

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
    setOutcome('Restocked');
    setMaxReturnableQuantities({});
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSearch = async () => {
    setStep('loading');
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
      const [fullSaleDetails, previousReturns] = await Promise.all([
        getSaleById(sale._id),
        getReturnsBySaleId(sale._id) 
      ]);

      setSaleDetails(fullSaleDetails);

      const alreadyReturned = {};
      previousReturns.forEach(ret => {
        ret.itemsReturned.forEach(item => {
          alreadyReturned[item.product._id] = (alreadyReturned[item.product._id] || 0) + item.quantity;
        });
      });

      const initialItems = {};
      const maxQuantities = {};
      fullSaleDetails.items.forEach(item => {
        if (item.product && item.product._id) {
          const previouslyReturnedQty = alreadyReturned[item.product._id] || 0;
          const maxReturnable = item.quantity - previouslyReturnedQty;
          maxQuantities[item.product._id] = maxReturnable >= 0 ? maxReturnable : 0; 
          initialItems[item.product._id] = 0; 
        }
      });
      setItemsToReturn(initialItems);
      setMaxReturnableQuantities(maxQuantities); 

      setStep('process');
    } catch (err) {
      toast.error('Failed to fetch sale details or previous returns.');
      console.error(err); 
      setStep('results');
    }
  };

  const handleQuantityChange = (productId, amount) => {
    const maxReturnable = maxReturnableQuantities[productId];

    setItemsToReturn(prev => {
        const currentQty = prev[productId] || 0;
        const newQty = currentQty + amount;

        if (newQty >= 0 && newQty <= maxReturnable) {
            return { ...prev, [productId]: newQty };
        }
        if (amount > 0 && newQty > maxReturnable) {
            return { ...prev, [productId]: maxReturnable };
        }
        if (amount < 0 && newQty < 0) {
            return { ...prev, [productId]: 0 };
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
        outcome: outcome,
    };

    if (returnPayload.itemsReturned.length === 0) {
        toast.warn('You must select at least one item to return.');
        return;
    }
    if (!reason.trim()) {
        toast.warn('A reason for the return is required.');
        return;
    }

    const totalRefund = returnPayload.itemsReturned.reduce((acc, returnedItem) => {
      const originalItem = saleDetails.items.find(i => i.product._id === returnedItem.product);
      return acc + ((originalItem?.priceAtTime || 0) * returnedItem.quantity);
    }, 0);


    let confirmMessage = `Process return for a refund of ₱${totalRefund.toFixed(2)}?`;
    if (outcome === 'Restocked') {
        confirmMessage += ` This will add stock back to inventory.`;
    } else if (outcome === 'Discarded') {
        confirmMessage += ` The item(s) will be marked as discarded and NOT restocked.`;
    } else {
        confirmMessage += ` The item(s) will NOT be restocked.`;
    }

    const isConfirmed = await confirm("Confirm Return", confirmMessage); 

    if (isConfirmed) {
      setStep('loading');
      try {
          await createReturn({ ...returnPayload, totalRefundAmount: totalRefund });
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
      // --- USE LOADING SPINNER ---
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <LoadingSpinner text="Processing..." />
        </Box>
      );
    }

    if (step === 'search') {
      return (
        <motion.div key="search" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
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
        </motion.div>
      );
    }

    if (step === 'results') {
        return (
            <motion.div key="results" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
              <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                      <TableHead><TableRow><TableCell>Sale Date</TableCell><TableCell>Customer</TableCell><TableCell align="right">Total</TableCell><TableCell align="center">Action</TableCell></TableRow></TableHead>
                      <TableBody>
                          {searchResults.map(sale => (
                              <TableRow key={sale._id} hover>
                                  <TableCell>{new Date(sale.createdAt).toLocaleString()}</TableCell>
                                  <TableCell>{sale.customer?.name || 'Walk-in'}</TableCell> 
                                  <TableCell align="right">₱{sale.totalAmount.toFixed(2)}</TableCell>
                                  <TableCell align="center"><Button size="small" onClick={() => handleSelectSale(sale)}>Select</Button></TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </TableContainer>
            </motion.div>
        );
    }

    if (step === 'process' && saleDetails) {
      return (
        <motion.div key="process" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
          <Typography variant="body2">ID: {saleDetails._id}</Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>Customer: {saleDetails.customer?.name || 'Walk-in'}</Typography> 
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead><TableRow><TableCell>Product</TableCell><TableCell align="center">Sold</TableCell><TableCell align="center">Max Return</TableCell><TableCell align="center">Return Qty</TableCell></TableRow></TableHead>
              <TableBody>
                {saleDetails.items.map(item => {
                  const maxReturnable = maxReturnableQuantities[item.product?._id] ?? 0;
                  const currentReturnQty = itemsToReturn[item.product?._id] ?? 0;
                  return (
                    <TableRow key={item.product?._id} sx={ maxReturnable === 0 ? { backgroundColor: '#f5f5f5', color: 'text.disabled' } : {}}>
                      <TableCell sx={ maxReturnable === 0 ? { color: 'inherit' } : {}}>{item.product?.name || 'Product not found'}</TableCell>
                      <TableCell align="center" sx={ maxReturnable === 0 ? { color: 'inherit' } : {}}>{item.quantity}</TableCell>
                      <TableCell align="center" sx={ maxReturnable === 0 ? { color: 'inherit', fontWeight: 'bold' } : {fontWeight: 'bold'}}>{maxReturnable}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconButton size="small" onClick={() => handleQuantityChange(item.product._id, -1)} disabled={maxReturnable === 0}><RemoveIcon fontSize="small"/></IconButton>
                            <Typography sx={{ mx: 1 }}>{currentReturnQty}</Typography>
                            <Tooltip title={maxReturnable === 0 ? "All items already returned" : ""}>
                              <span> 
                                <IconButton size="small" onClick={() => handleQuantityChange(item.product._id, 1)} disabled={currentReturnQty >= maxReturnable || maxReturnable === 0}><AddIcon fontSize="small"/></IconButton>
                              </span>
                            </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TextField label="Reason for Return *" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth multiline rows={2} required sx={{ mt: 2 }}/>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="return-outcome-label">Return Outcome *</InputLabel>
            <Select
              labelId="return-outcome-label"
              id="return-outcome-select"
              value={outcome}
              label="Return Outcome *"
              onChange={(e) => setOutcome(e.target.value)}
            >
              <MenuItem value="Restocked">Restocked (Add back to inventory)</MenuItem>
              <MenuItem value="Refunded">Refunded Only (Do not restock)</MenuItem>
              <MenuItem value="Replaced">Replaced (Do not restock)</MenuItem>
              <MenuItem value="Discarded">Discarded (Do not restock)</MenuItem>
            </Select>
          </FormControl>
        </motion.div>
      );
    }
    return <Alert severity="error">An unexpected error occurred. Please try again.</Alert>;
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Process New Return</DialogTitle>
      <DialogContent>
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </DialogContent>
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