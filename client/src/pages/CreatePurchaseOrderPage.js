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
  RadioGroup, FormControlLabel, Radio, FormLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import LoadingSpinner from '../components/LoadingSpinner';

const CreatePurchaseOrderPage = () => {
  const navigate = useNavigate();
  const { confirm } = useContext(ConfirmationContext);

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
      <motion.div initial="hidden" animate="visible" variants={pageVariants}>
        <Typography variant="h4" component="h1" gutterBottom>
            Create New Purchase Order
        </Typography>
        <Paper sx={{ p: 3 }}>
            <Grid container spacing={3}>
            {/* UPDATED: Step 1 changes width dynamically. 
                If supplier is selected, it takes 6 columns (half).
                If not, it takes 12 columns (full).
            */}
            <Grid item size={{ xs: 12, md: supplier ? 6 : 12 }}>
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

            {/* UPDATED: Step 2 only renders if supplier is selected */}
            <AnimatePresence>
                {supplier && (
                    <Grid item size={{ xs: 12, md: 6 }} component={motion.div} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                        <Typography variant="h6" gutterBottom>Step 2: Order Type</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={poType === 'Consignment' ? 6 : 12}>
                                <FormControl fullWidth>
                                <InputLabel>Order Type</InputLabel>
                                <Select
                                    value={poType}
                                    label="Order Type"
                                    onChange={(e) => setPoType(e.target.value)}
                                    disabled={!supplier}
                                >
                                    <MenuItem value="Purchase">Purchase</MenuItem>
                                    <MenuItem value="Consignment">Consignment</MenuItem>
                                </Select>
                                </FormControl>
                            </Grid>
                            
                            {poType === 'Consignment' && (
                                <Grid item xs={12} md={6}>
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">Method</FormLabel>
                                        <RadioGroup
                                            row
                                            value={consignmentMethod}
                                            onChange={(e) => setConsignmentMethod(e.target.value)}
                                        >
                                            <FormControlLabel value="System" control={<Radio />} label="System Generated" />
                                            <FormControlLabel value="Manual" control={<Radio />} label="Upload Signed PDF" />
                                        </RadioGroup>
                                    </FormControl>
                                </Grid>
                            )}
                        </Grid>
                    </Grid>
                )}
            </AnimatePresence>

            {/* Dynamic Inputs for Consignment (Terms or Upload) */}
            {supplier && poType === 'Consignment' && (
                <Grid item size={{ xs: 12 }}>
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <Paper variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: '#fcfcfc' }}>
                            {consignmentMethod === 'System' ? (
                                <>
                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                                        Terms and Conditions (For System PDF)
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={4}
                                        variant="outlined"
                                        value={termsAndConditions}
                                        onChange={(e) => setTermsAndConditions(e.target.value)}
                                        placeholder="Enter terms..."
                                        // --- UPDATED: Enable Resizing ---
                                        sx={{
                                            '& .MuiInputBase-root': {
                                                padding: 1.5
                                            },
                                            '& textarea': {
                                                resize: 'vertical', // Allows user to resize vertically
                                                minHeight: '100px'
                                            }
                                        }}
                                        // -------------------------------
                                    />
                                </>
                            ) : (
                                <>
                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                                        Upload Signed Consignment Agreement
                                    </Typography>
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
                    </motion.div>
                </Grid>
            )}

            {/* Step 3: Items (Shows only after Step 1 is done) */}
            {supplier && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    transition={{ duration: 0.5 }}
                    style={{ width: '100%' }}
                >
                    <Grid container spacing={3} sx={{ width: '100%', ml: 0 }}>
                        <Grid item size={{ xs: 12 }}>
                            <Typography variant="h6">Step 3: Add Items</Typography>
                        </Grid>

                        <Grid item size={{ xs: 12 }}>
                            <Grid container spacing={2} alignItems="center">
                            <Grid item size={{ xs: 12, sm: 6, md: 5 }}>
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
                                            {isProductLoading ? <LoadingSpinner text="" /> : null}
                                            {params.InputProps.endAdornment}
                                        </>
                                        ),
                                    }}
                                    />
                                )}
                                />
                            </Grid>
                            <Grid item size={{ xs: 6, sm: 3, md: 2 }}>
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
                            <Grid item size={{ xs: 6, sm: 3, md: 3 }}>
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

                        <Grid item size={{ xs: 12 }}>
                            <TextField label="Notes (Optional)" multiline rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth />
                        </Grid>

                        <Grid item size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button variant="outlined" color="secondary" onClick={() => navigate('/purchase-orders')}>Cancel</Button>
                            <Button variant="contained" onClick={handleSubmit} disabled={loading || items.length === 0 || !supplier}>
                            {loading ? <LoadingSpinner text="" /> : `Create ${poType} Order`}
                            </Button>
                        </Grid>
                    </Grid>
                </motion.div>
            )}
            </Grid>
        </Paper>
      </motion.div>
    </Container>
  );
};

export default CreatePurchaseOrderPage;