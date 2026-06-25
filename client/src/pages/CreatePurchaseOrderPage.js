// client/src/pages/CreatePurchaseOrderPage.js
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSuppliers, createPurchaseOrder } from '../api/purchaseOrderApi';
import { getProductsBySupplier } from '../api/productApi';
import { toast } from 'react-toastify';
import ConfirmationContext from '../context/ConfirmationContext';
import { motion, AnimatePresence } from 'framer-motion';

import {
  Container, Typography, Box, Paper, Grid, TextField, Button, Autocomplete,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton,
  Alert, FormControl, InputLabel, Select, MenuItem, 
  RadioGroup, FormControlLabel, Radio,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, List, ListItem, ListItemIcon, ListItemText, CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import LoadingSpinner from '../components/LoadingSpinner';

const InstructionModal = ({ open, onClose }) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'primary.main', color: 'white' }}>
      <InfoIcon /> Create Order Guide
    </DialogTitle>
    <DialogContent dividers>
      <Typography variant="h6" gutterBottom color="primary">Order Types</Typography>
      <List dense>
        <ListItem>
          <ListItemIcon><CheckCircleOutlineIcon color="success" /></ListItemIcon>
          <ListItemText 
            primary="Standard Purchase" 
            secondary="Use this for regular stock replenishment where you pay the supplier immediately or on terms." 
          />
        </ListItem>
        <ListItem>
          <ListItemIcon><CheckCircleOutlineIcon color="info" /></ListItemIcon>
          <ListItemText 
            primary="Consignment" 
            secondary="Use this when the supplier provides goods but retains ownership until they are sold. You pay only for what you sell." 
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 2 }} />

      <Typography variant="h6" gutterBottom color="primary">Consignment Methods</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', height: '100%' }}>
            <Typography variant="subtitle1" fontWeight="bold">1. System Generated</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Best for a fully digital workflow.
            </Typography>
            <ul style={{ paddingLeft: 20, margin: 0, fontSize: '0.875rem' }}>
                <li>You define the <strong>Terms & Conditions</strong> here.</li>
                <li>The system generates a PDF Agreement.</li>
                <li>A link is sent to the Supplier to <strong>digitally sign</strong>.</li>
                <li>Once signed, you countersign to approve the PO.</li>
            </ul>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', height: '100%' }}>
            <Typography variant="subtitle1" fontWeight="bold">2. Upload Signed PDF</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Best if you already have a contract.
            </Typography>
            <ul style={{ paddingLeft: 20, margin: 0, fontSize: '0.875rem' }}>
                <li>You have already discussed and signed a contract offline.</li>
                <li>You simply <strong>upload the scanned PDF/Image</strong> here.</li>
                <li>The PO is created immediately with the file attached.</li>
            </ul>
          </Paper>
        </Grid>
      </Grid>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} variant="contained">Got it</Button>
    </DialogActions>
  </Dialog>
);

const CreatePurchaseOrderPage = () => {
  const navigate = useNavigate();
  const { confirm } = useContext(ConfirmationContext);

  const [openHelp, setOpenHelp] = useState(true);

  // Form State
  const [supplier, setSupplier] = useState(null);
  const [poType, setPoType] = useState('Purchase'); 
  
  // Consignment State
  const [consignmentMethod, setConsignmentMethod] = useState('System'); 
  const [termsAndConditions, setTermsAndConditions] = useState(
    "1. The Consignor agrees to place the items listed below with the Consignee for sale on a consignment basis.\n" +
    "2. Ownership of the items remains with the Consignor until they are sold to a customer.\n" +
    "3. The Consignee agrees to pay the Consignor the 'Unit Cost' indicated below only upon the successful sale.\n" +
    "4. The Consignee assumes responsibility for the safekeeping of the items while in their possession.\n" +
    "5. Unsold items may be returned to the Consignor if they remain unsold after 60 days from the date of delivery."
  ); 
  const [signedAgreementFile, setSignedAgreementFile] = useState(null); 

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

  // --- FRAMER MOTION VARIANTS ---
  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  };
  // ------------------------------

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        setLoading(true);
        const suppliersData = await getSuppliers();
        setSuppliersList(suppliersData.filter(s => s.status === 'Approved'));
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
    // Default based on supplier preference
    const defaultType = newValue?.defaultPaymentTerms === 'Consignment' ? 'Consignment' : 'Purchase';
    setPoType(defaultType);
    setConsignmentMethod('System'); 
    setSignedAgreementFile(null);

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

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
        toast.error('Please upload a PDF or an Image file.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { 
        toast.error('File size must be less than 5MB.');
        return;
      }
      setSignedAgreementFile(file);
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
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
    if (cost < 0) {
        toast.warn('Cost cannot be negative.');
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
  
  const handleFocus = (event) => {
    event.target.select();
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

    if (poType === 'Consignment') {
        if (consignmentMethod === 'Manual' && !signedAgreementFile) {
            toast.error('Please upload the signed consignment agreement.');
            return;
        }
        if (consignmentMethod === 'System' && !termsAndConditions.trim()) {
            toast.error('Terms and Conditions are required for System Consignment.');
            return;
        }
    }

    let confirmationMessage = '';
    if (poType === 'Consignment') {
        if (consignmentMethod === 'Manual') {
            confirmationMessage = `Create MANUAL Consignment Order? The uploaded agreement will be sent to ${supplier.name}.`;
        } else {
            confirmationMessage = `Create SYSTEM Consignment Order? A link to sign will be sent to ${supplier.name}.`;
        }
    } else {
      confirmationMessage = supplier.email
        ? `This will create a PURCHASE order and send an email with the review link to ${supplier.name} (${supplier.email}). Proceed?`
        : `This will create a PURCHASE order. The supplier (${supplier.name}) does not have an email address saved. You will need to copy the link from the PO details page. Proceed?`;
    }

    const isConfirmed = await confirm('Confirm Purchase Order Creation', confirmationMessage);
    if (!isConfirmed) return;

    setLoading(true); 

    try {
        let signedAgreementUrl = '';
        if (poType === 'Consignment' && consignmentMethod === 'Manual' && signedAgreementFile) {
            signedAgreementUrl = await convertToBase64(signedAgreementFile);
        }

        const purchaseOrderData = {
            supplier: supplier._id,
            poType: poType,
            consignmentMethod: poType === 'Consignment' ? consignmentMethod : 'System',
            termsAndConditions: poType === 'Consignment' && consignmentMethod === 'System' ? termsAndConditions : '',
            signedAgreementUrl: signedAgreementUrl,
            items: items.map(item => ({
                product: item.product._id,
                quantity: item.quantity,
                unitCost: item.cost,
            })),
            notes,
        };

        const newPO = await createPurchaseOrder(purchaseOrderData);
        toast.success(`Purchase Order ${newPO.poNumber} created!`);
        navigate(`/purchase-orders/${newPO._id}`);
    } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to create Purchase Order.');
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  if (loading && !suppliersList.length) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <LoadingSpinner text="Loading Suppliers..." />
        </Box>
      );
  }
  
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <InstructionModal open={openHelp} onClose={() => setOpenHelp(false)} />
      
      <motion.div initial="hidden" animate="visible" variants={pageVariants}>
        
        {/* Header - Responsive */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 3, gap: 1 }}>
            <Typography variant="h4" component="h1" fontWeight={700}>
                Create New Purchase Order
            </Typography>
            <Button 
                startIcon={<HelpOutlineIcon />} 
                onClick={() => setOpenHelp(true)} 
                variant="text"
                sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'flex-start', sm: 'center' } }}
            >
                Guide & Instructions
            </Button>
        </Box>

        <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Grid container spacing={3}>
                
                {/* Step 1: Supplier Selection */}
                <Grid size={{ xs: 12, md: supplier ? 6 : 12 }}>
                    <Typography variant="h6" gutterBottom fontWeight={600}>Step 1: Select Supplier</Typography>
                    <Autocomplete
                        options={suppliersList}
                        getOptionLabel={(option) => option.name || ''}
                        isOptionEqualToValue={(option, value) => option._id === value._id}
                        value={supplier}
                        onChange={handleSupplierChange}
                        renderInput={(params) => <TextField {...params} label="Select Supplier" variant="outlined" />}
                    />
                </Grid>

                {/* Step 2: Order Type */}
                <AnimatePresence>
                    {supplier && (
                        <Grid size={{ xs: 12, md: 6 }} component={motion.div} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                            <Typography variant="h6" gutterBottom fontWeight={600}>Step 2: Order Type</Typography>
                            <FormControl fullWidth>
                                <InputLabel>Order Type</InputLabel>
                                <Select
                                    value={poType}
                                    label="Order Type"
                                    onChange={(e) => setPoType(e.target.value)}
                                    disabled={!supplier}
                                >
                                    <MenuItem value="Purchase">Standard Purchase</MenuItem>
                                    <MenuItem value="Consignment">Consignment</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    )}
                </AnimatePresence>

                {/* Step 3: Consignment Method (Only for Consignment) */}
                <AnimatePresence>
                    {supplier && poType === 'Consignment' && (
                        <Grid size={{ xs: 12 }} component={motion.div} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'primary.50', borderColor: 'primary.main' }}>
                                <Typography variant="h6" gutterBottom fontWeight={600}>Step 3: Select Consignment Method</Typography>
                                <FormControl component="fieldset">
                                    <RadioGroup
                                        row
                                        value={consignmentMethod}
                                        onChange={(e) => setConsignmentMethod(e.target.value)}
                                    >
                                        <FormControlLabel value="System" control={<Radio />} label="System Generated (Recommended)" />
                                        <FormControlLabel value="Manual" control={<Radio />} label="Upload Signed PDF" />
                                    </RadioGroup>
                                </FormControl>
                            </Paper>
                        </Grid>
                    )}
                </AnimatePresence>

                {/* Step 4: Method Details (Terms OR Upload) */}
                <AnimatePresence>
                    {supplier && poType === 'Consignment' && (
                        <Grid size={{ xs: 12 }} component={motion.div} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                            <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#fcfcfc' }}>
                                {consignmentMethod === 'System' ? (
                                    <>
                                        <Typography variant="h6" gutterBottom fontWeight={600}>Step 4: Assign Terms and Conditions</Typography>
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={5}
                                            variant="outlined"
                                            value={termsAndConditions}
                                            onChange={(e) => setTermsAndConditions(e.target.value)}
                                            placeholder="Enter terms..."
                                            sx={{ '& textarea': { resize: 'vertical' } }}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <Typography variant="h6" gutterBottom fontWeight={600}>Step 4: Upload Signed Agreement</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Button
                                                component="label"
                                                variant="outlined"
                                                startIcon={<UploadFileIcon />}
                                            >
                                                Select File
                                                <input type="file" hidden accept="application/pdf,image/*" onChange={handleFileUpload} />
                                            </Button>
                                            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                                {signedAgreementFile ? signedAgreementFile.name : 'No file chosen'}
                                            </Typography>
                                        </Box>
                                    </>
                                )}
                            </Paper>
                        </Grid>
                    )}
                </AnimatePresence>

                {/* Step 5 (or 3): Add Items */}
                {supplier && (
                    <Grid size={{ xs: 12 }} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Typography variant="h6" gutterBottom fontWeight={600}>
                            {poType === 'Consignment' ? 'Step 5: Add Items' : 'Step 3: Add Items'}
                        </Typography>
                        
                        <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
                            <Grid size={{ xs: 12, md: 5 }}>
                                <Autocomplete
                                options={supplierProducts.filter(p => !items.some(item => item.product._id === p._id))}
                                getOptionLabel={(option) => `${option.name} (${option.itemCode})`}
                                isOptionEqualToValue={(option, value) => option._id === value._id}
                                value={selectedProduct}
                                onChange={(event, newValue) => {
                                    setSelectedProduct(newValue);
                                    if (newValue) {
                                        setCost(newValue.cost !== undefined ? newValue.cost : 0);
                                    } else {
                                        setCost(0);
                                    }
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
                                            {isProductLoading ? <CircularProgress size={20} color="inherit" /> : null}
                                            {params.InputProps.endAdornment}
                                        </>
                                        ),
                                    }}
                                    />
                                )}
                                />
                            </Grid>
                            <Grid size={{ xs: 6, md: 2 }}>
                                <TextField 
                                label="Quantity" 
                                type="number" 
                                value={quantity} 
                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10)) || 1)} 
                                fullWidth 
                                inputProps={{ min: 1 }}
                                onFocus={handleFocus} 
                                />
                            </Grid>
                            <Grid size={{ xs: 6, md: 3 }}>
                                <TextField 
                                label="Unit Cost (₱)" 
                                type="number" 
                                value={cost} 
                                onFocus={handleFocus}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setCost(val === '' ? '' : Math.max(0, parseFloat(val)));
                                }} 
                                fullWidth 
                                inputProps={{ step: "0.01", min: 0 }} 
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 2 }}>
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

                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                            <Table>
                                <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Quantity</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Unit Cost</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Subtotal</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
                                </TableRow>
                                </TableHead>
                                <TableBody component={AnimatePresence}>
                                {items.map((item) => (
                                    <TableRow 
                                        key={item.product._id}
                                        component={motion.tr}
                                        variants={rowVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        layout
                                    >
                                    <TableCell>{item.product.name} ({item.product.itemCode})</TableCell>
                                    <TableCell align="right">{item.quantity}</TableCell>
                                    <TableCell align="right">₱{Number(item.cost).toFixed(2)}</TableCell>
                                    <TableCell align="right">₱{(item.quantity * item.cost).toFixed(2)}</TableCell>
                                    <TableCell align="center">
                                        <IconButton onClick={() => handleRemoveItem(item.product._id)} color="error" size="small">
                                        <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                    </TableRow>
                                ))}
                                {items.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>No items added yet.</TableCell></TableRow>
                                ) : (
                                    <TableRow sx={{ '& td': { border: 0, fontWeight: 700 } }}>
                                    <TableCell colSpan={3} align="right"><Typography variant="h6">Grand Total:</Typography></TableCell>
                                    <TableCell align="right"><Typography variant="h6" color="primary.main">₱{grandTotal.toFixed(2)}</Typography></TableCell>
                                    <TableCell />
                                    </TableRow>
                                )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <Grid size={{ xs: 12 }}>
                            <TextField 
                                label="Notes (Optional)" 
                                multiline 
                                rows={3} 
                                value={notes} 
                                onChange={(e) => setNotes(e.target.value)} 
                                fullWidth 
                                sx={{ '& textarea': { resize: 'vertical' } }}
                            />
                        </Grid>

                        {/* Action Buttons - Stacked on Mobile, Right on Desktop */}
                        <Grid container spacing={2} sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Grid size={{ xs: 12, sm: 'auto' }} sx={{ ml: { sm: 'auto' }, order: { xs: 2, sm: 1 } }}>
                                <Button 
                                    variant="outlined" 
                                    color="inherit" 
                                    onClick={() => navigate('/purchase-orders')}
                                    fullWidth
                                >
                                    Cancel
                                </Button>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 'auto' }} sx={{ order: { xs: 1, sm: 2 } }}>
                                <Button 
                                    variant="contained" 
                                    onClick={handleSubmit} 
                                    disabled={loading || items.length === 0 || !supplier}
                                    fullWidth
                                    size="large"
                                >
                                    {loading ? <CircularProgress size={24} color="inherit" /> : `Create ${poType} Order`}
                                </Button>
                            </Grid>
                        </Grid>
                    </Grid>
                )}
            </Grid>
        </Paper>
      </motion.div>
    </Container>
  );
};

export default CreatePurchaseOrderPage;