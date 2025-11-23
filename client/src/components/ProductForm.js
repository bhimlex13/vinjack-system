// client/src/components/ProductForm.js
import React, { useState, useEffect, useContext, useMemo } from 'react';
import api from '../api/axios';
import ConfirmationContext from '../context/ConfirmationContext'; 
import AuthContext from '../context/AuthContext';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion'; // --- NEW IMPORT ---

// MUI Imports
import {
  Box, Button, TextField, FormControl, InputLabel, Select, MenuItem,
  Grid, ToggleButtonGroup, ToggleButton, Alert, Stack, InputAdornment, IconButton,
  Typography, Tooltip, FormHelperText,
  Autocomplete, 
  Dialog, 
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper, 
  List, 
  ListItem, 
  Divider,
  FormControlLabel, 
  Checkbox 
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'; 
import DeleteIcon from '@mui/icons-material/Delete'; 
import StarIcon from '@mui/icons-material/Star'; 
import StarBorderIcon from '@mui/icons-material/StarBorder'; 
import ArchiveIcon from '@mui/icons-material/Archive';

// --- NEW IMPORT ---
import LoadingSpinner from './LoadingSpinner';

// Add Supplier Dialog Component
const AddSupplierDialog = ({ open, onClose, allSuppliers, assignedSupplierIds, onAddSuppliers }) => {
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const availableSuppliers = useMemo(() => {
    return allSuppliers.filter(s => !assignedSupplierIds.includes(s._id));
  }, [allSuppliers, assignedSupplierIds]);
  const handleAdd = () => {
    onAddSuppliers(selectedSuppliers);
    setSelectedSuppliers([]);
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Suppliers to Product</DialogTitle>
      <DialogContent>
        <Autocomplete
          multiple sx={{ mt: 2 }} options={availableSuppliers}
          getOptionLabel={(option) => option.name || ''} value={selectedSuppliers}
          onChange={(event, newValue) => { setSelectedSuppliers(newValue); }}
          isOptionEqualToValue={(option, value) => option._id === value._id}
          renderInput={(params) => ( <TextField {...params} variant="outlined" label="Select Suppliers" placeholder="Choose suppliers..." /> )}
        />
        {availableSuppliers.length === 0 && <Typography sx={{mt: 2, color: 'text.secondary'}}>All available suppliers are already assigned to this product.</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { setSelectedSuppliers([]); onClose(); }}>Cancel</Button>
        <Button onClick={handleAdd} variant="contained" disabled={selectedSuppliers.length === 0}> Add Selected </Button>
      </DialogActions>
    </Dialog>
  );
};


const ProductForm = ({ onFormSubmit, productToEdit, onClose, onProductArchive }) => {
  const { confirm } = useContext(ConfirmationContext); 
  const { user } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    itemCode: '', name: '', category: '', brand: '',
    price: '', quantity: '', maxStock: '', image: '',
    defaultCost: 0, 
    supplierCosts: [],
    status: 'active',
    isSerialized: false 
  });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [dropdownsLoaded, setDropdownsLoaded] = useState(false);
  const [error, setError] = useState('');
  const [imageSource, setImageSource] = useState('url');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isAddSupplierDialogOpen, setIsAddSupplierDialogOpen] = useState(false);

  // Fetch dropdown data
  useEffect(() => {
     const fetchDropdownData = async () => {
      console.log("ProductForm: Fetching dropdown data...");
      setSupplierLoading(true);
      setDropdownsLoaded(false); 
      try {
        const [catRes, brandRes, supRes] = await Promise.all([
          api.get('/categories'),
          api.get('/brands'),
          api.get('/suppliers')
        ]);
        setCategories(catRes.data);
        setBrands(brandRes.data);
        setAllSuppliers(supRes.data);
        setDropdownsLoaded(true); 
        console.log("ProductForm: All dropdowns loaded.");
      } catch (fetchError) {
        setError("Could not load form dropdown data.");
        toast.error("Failed to load categories, brands, or suppliers.");
      } finally {
        setSupplierLoading(false);
      }
    };
    fetchDropdownData();
  }, []);

  // Initialize form data
  useEffect(() => {
    const initialData = productToEdit ? {
      itemCode: productToEdit.itemCode, name: productToEdit.name, category: productToEdit.category?._id || '',
      brand: productToEdit.brand?._id || '', price: productToEdit.price, quantity: productToEdit.quantity,
      maxStock: productToEdit.maxStock || '', image: productToEdit.image || '',
      defaultCost: productToEdit.defaultCost || 0,
      supplierCosts: Array.isArray(productToEdit.supplierCosts) ? productToEdit.supplierCosts.map(sc => ({ supplier: sc.supplier?._id || sc.supplier, cost: sc.cost || 0 })).filter(sc => sc.supplier) : [],
      status: productToEdit.status || 'active',
      isSerialized: productToEdit.isSerialized || false 
    } : { itemCode: '', name: '', category: '', brand: '', price: '', quantity: '', maxStock: '', image: '', defaultCost: 0, supplierCosts: [], status: 'active', isSerialized: false }; 
    
    setFormData(initialData); setUploadedFileName('');
    if (productToEdit && productToEdit.image && !productToEdit.image.startsWith('data:image')) { setImageSource('url'); } else if (productToEdit && productToEdit.image) { setImageSource('upload'); } else { setImageSource('url'); }
  }, [productToEdit]);


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
   };
   
   const handleCheckboxChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.checked });
   };

  const handleSupplierCostChange = (supplierId, newCost) => {
      setFormData(prevData => ({ ...prevData, supplierCosts: prevData.supplierCosts.map(sc => sc.supplier === supplierId ? { ...sc, cost: newCost === '' ? '' : Number(newCost) } : sc ) }));
   };

   const handleSetDefaultCost = (supplierId, cost) => {
       const numericCost = Number(cost);
       if (!isNaN(numericCost) && numericCost >= 0) {
           setFormData(prevData => ({
               ...prevData,
               defaultCost: numericCost
           }));
           toast.success(`Set default cost to ₱${numericCost.toFixed(2)}`);
       } else {
           toast.warn("Cannot set an invalid or negative cost as default.");
       }
   };

  const handleAddSuppliers = (suppliersToAdd) => {
      const newSupplierCosts = suppliersToAdd.map(supplierObj => ({ supplier: supplierObj._id, cost: '' }));
      setFormData(prevData => { const existingSupplierIds = new Set(prevData.supplierCosts.map(sc => sc.supplier)); const trulyNewSupplierCosts = newSupplierCosts.filter(nsc => !existingSupplierIds.has(nsc.supplier)); return { ...prevData, supplierCosts: [...prevData.supplierCosts, ...trulyNewSupplierCosts] } });
   };

  const handleRemoveSupplier = async (supplierIdToRemove) => {
      const supplierToRemove = allSuppliers.find(s => s._id === supplierIdToRemove); const supplierName = supplierToRemove ? supplierToRemove.name : 'this supplier';
      const isConfirmed = await confirm('Remove Supplier?', `Are you sure you want to remove ${supplierName} from this product? This will also remove its associated cost.`);
      if (isConfirmed) { setFormData(prevData => ({ ...prevData, supplierCosts: prevData.supplierCosts.filter(sc => sc.supplier !== supplierIdToRemove) })); toast.info(`${supplierName} removed from product.`); }
  };


  const handleGenerateItemCode = () => {
     const { name, category, brand } = formData;
    if (!name || !category || !brand) {
      toast.warn('Please fill in Product Name, Category, and Brand first.'); return; }
    const categoryName = categories.find(c => c._id === category)?.name || 'CAT';
    const brandName = brands.find(b => b._id === brand)?.name || 'BRA';
    const namePart = name.substring(0, 3).toUpperCase();
    const catPart = categoryName.substring(0, 3).toUpperCase();
    const brandPart = brandName.substring(0, 3).toUpperCase();
    const uniquePart = Date.now().toString().slice(-4);
    const newItemCode = `${namePart}-${catPart}-${brandPart}-${uniquePart}`;
    setFormData({ ...formData, itemCode: newItemCode });
  };
  
  const resizeImage = (file, maxWidth, maxHeight) => {
      return new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = (event) => { const img = new Image(); img.src = event.target.result;
        img.onload = () => { const canvas = document.createElement('canvas'); let { width, height } = img;
          if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } }
          else { if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; } }
          canvas.width = width; canvas.height = height; canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.9)); };
        img.onerror = (error) => reject(error); };
      reader.onerror = (error) => reject(error); });
   };
   
  const handleImageUpload = async (e) => {
      const file = e.target.files[0];
    if (file) { setUploadedFileName(file.name);
      try { const resizedImage = await resizeImage(file, 800, 800); setFormData({ ...formData, image: resizedImage }); toast.success("Image ready for upload."); }
      catch (error) { setError("Failed to process image. Please try another file."); setUploadedFileName(''); } }
   };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (productToEdit && formData.isSerialized === true && productToEdit.quantity > 0) {
        setError(`Cannot enable serialization when current stock is ${productToEdit.quantity}. Set quantity to 0 first.`);
        toast.error(`Cannot enable serialization when current stock is > 0.`);
        return;
    }
    
    const invalidCostEntry = formData.supplierCosts.find(sc => sc.cost === '' || isNaN(sc.cost) || Number(sc.cost) < 0);
    if (invalidCostEntry) { setError(`Please enter a valid, non-negative cost for all assigned suppliers.`); toast.warn(`Please enter a valid cost for all suppliers.`); return; }
    if (!productToEdit && (!formData.supplierCosts || formData.supplierCosts.length === 0)) { setError('Please assign at least one supplier and set their cost.'); toast.warn('Please assign at least one supplier and set their cost.'); return; }
    
    const dataToSend = { ...formData }; 
    if (productToEdit) { delete dataToSend.quantity; }
    
    const isConfirmed = await confirm(productToEdit ? 'Save these changes?' : 'Add this new product?');
    if (isConfirmed) {
      setError('');
      try {
        console.log("Submitting product data:", dataToSend);
        const res = productToEdit
          ? await api.put(`/products/${productToEdit._id}`, dataToSend)
          : await api.post('/products', dataToSend);
        toast.success(productToEdit ? 'Product updated successfully!' : 'Product added successfully!');
        onFormSubmit(res.data);
        onClose();
      } catch (err) {
         console.error("Error submitting product:", err.response?.data || err);
         setError(err.response?.data?.message || 'An error occurred saving the product.');
         toast.error(err.response?.data?.message || 'Failed to save product.');
      }
    }
   };

  const handleArchive = async () => {
     const isConfirmed = await confirm(
        `Archive this product?`, 
        `Are you sure you want to archive "${productToEdit.name}"? It will be hidden from the sales page but can be reactivated later.`
      );
      
    if (isConfirmed) {
      try { 
        await onProductArchive(productToEdit._id);
        toast.success('Product archived successfully!'); 
        onClose(); 
      }
      catch (err) { 
        setError(err.response?.data?.message || 'Failed to archive product.'); 
        toast.error(err.response?.data?.message || 'Failed to archive product.'); 
      }
    }
  };

  const getAssignedSupplierDetailsWithCost = useMemo(() => {
      if (!formData.supplierCosts || formData.supplierCosts.length === 0 || !allSuppliers || allSuppliers.length === 0) { return []; }
      return formData.supplierCosts.map(sc => { const supplierDetails = allSuppliers.find(s => String(s._id) === String(sc.supplier)); if (!supplierDetails) return null; return { ...supplierDetails, cost: sc.cost }; }).filter(Boolean);
  }, [formData.supplierCosts, allSuppliers]);


  // --- SHOW LOADING SPINNER IF DATA FETCHING ---
  if (supplierLoading && !dropdownsLoaded) {
      return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
              <LoadingSpinner text="Loading form data..." />
          </Box>
      );
  }

  return (
    <Box sx={{ minWidth: 600, p: 3, pt: 1 }}>
        <AddSupplierDialog
            open={isAddSupplierDialogOpen}
            onClose={() => setIsAddSupplierDialogOpen(false)}
            allSuppliers={allSuppliers}
            assignedSupplierIds={formData.supplierCosts.map(sc => sc.supplier)}
            onAddSuppliers={handleAddSuppliers}
        />

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            {/* Item Code, Name */}
             <Grid item size={{ xs: 12 }}> <TextField fullWidth required name="itemCode" label="Item Code" value={formData.itemCode} onChange={handleChange} disabled={!!productToEdit} InputProps={{ endAdornment: ( <InputAdornment position="end"> <Tooltip title="Generate Unique Item Code"><IconButton onClick={handleGenerateItemCode} edge="end" disabled={!!productToEdit}> <AutoFixHighIcon /> </IconButton></Tooltip> </InputAdornment> ) }} /> {!!productToEdit && <FormHelperText>Item Code cannot be changed after creation.</FormHelperText>} </Grid>
             <Grid item size={{ xs: 12 }}><TextField fullWidth required name="name" label="Product Name" value={formData.name} onChange={handleChange} /></Grid>

            {/* Category & Brand Select */}
            <Grid item size={{ xs: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  label="Category"
                  value={dropdownsLoaded && categories.some(c => c._id === formData.category) ? formData.category : ''}
                  onChange={handleChange}
                >
                  {categories.map(c => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item size={{ xs: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Brand</InputLabel>
                <Select
                  name="brand"
                  label="Brand"
                  value={dropdownsLoaded && brands.some(b => b._id === formData.brand) ? formData.brand : ''}
                  onChange={handleChange}
                >
                  {brands.map(b => <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Is Serialized Checkbox */}
             <Grid item size={{ xs: 12 }}>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={formData.isSerialized}
                            onChange={handleCheckboxChange}
                            name="isSerialized"
                            disabled={!!productToEdit && productToEdit.quantity > 0} 
                        />
                    }
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            Track Specific Serial Numbers/Tags
                            <Tooltip title="Enabling serialization means each unit must have a unique ID upon receipt and sale. If editing, this can only be enabled if current stock is 0.">
                                <InfoOutlinedIcon sx={{ ml: 0.5 }} fontSize="small" color="action" />
                            </Tooltip>
                        </Box>
                    }
                />
                {productToEdit && productToEdit.quantity > 0 && formData.isSerialized === false && (
                    <FormHelperText error>Cannot enable serialization while current stock is {productToEdit.quantity}. Set quantity to 0 first.</FormHelperText>
                )}
            </Grid>

            {/* Supplier Display Area */}
            <Grid item size={{ xs: 12 }}>
                <Typography variant="subtitle2" gutterBottom>Assigned Suppliers & Costs</Typography>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <AnimatePresence>
                        {getAssignedSupplierDetailsWithCost.length > 0 ? (
                            <List dense disablePadding component={motion.ul}>
                                {getAssignedSupplierDetailsWithCost.map((supplier, index) => {
                                    const isDefault = Number(supplier.cost) === Number(formData.defaultCost) && Number(supplier.cost) >= 0 && supplier.cost !== '';
                                    return (
                                        <motion.li 
                                            key={supplier._id} 
                                            initial={{ opacity: 0, height: 0 }} 
                                            animate={{ opacity: 1, height: 'auto' }} 
                                            exit={{ opacity: 0, height: 0 }}
                                        >
                                            <ListItem sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, px: 0 }}>
                                                <Typography sx={{ flexShrink: 0, minWidth: '100px', mr: 1 }}>{supplier.name}</Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Tooltip title={isDefault ? "This is the default cost" : "Set as default cost"}>
                                                        <span> 
                                                            <IconButton
                                                                onClick={() => handleSetDefaultCost(supplier._id, supplier.cost)}
                                                                color={isDefault ? "primary" : "default"}
                                                                size="small"
                                                                disabled={isDefault || supplier.cost === '' || isNaN(Number(supplier.cost)) || Number(supplier.cost) < 0}
                                                            >
                                                                {isDefault ? <StarIcon /> : <StarBorderIcon />}
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                    <TextField
                                                        size="small" label="Cost" type="number" required
                                                        value={supplier.cost ?? ''} 
                                                        onChange={(e) => handleSupplierCostChange(supplier._id, e.target.value)}
                                                        inputProps={{ step: "0.01", min: 0 }} sx={{ width: '120px' }}
                                                        InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
                                                    />
                                                    <Tooltip title={`Remove ${supplier.name}`}>
                                                        <IconButton onClick={() => handleRemoveSupplier(supplier._id)} size="small" color="error">
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </ListItem>
                                            {index < getAssignedSupplierDetailsWithCost.length - 1 && <Divider component="li" />}
                                        </motion.li>
                                    );
                                })}
                            </List>
                        ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ml: 1}}>No suppliers assigned yet.</Typography>
                        )}
                    </AnimatePresence>
                </Paper>
                 <Button size="small" startIcon={<AddCircleOutlineIcon />} onClick={() => setIsAddSupplierDialogOpen(true)} sx={{ mt: 1 }} disabled={supplierLoading} > Add Supplier </Button>
                 {(!productToEdit && (!formData.supplierCosts || formData.supplierCosts.length === 0)) && (error.includes('supplier') || error.includes('cost')) && <FormHelperText error>{error}</FormHelperText> }
                 {formData.supplierCosts.some(sc => sc.cost === '' || isNaN(sc.cost) || Number(sc.cost) < 0) && <FormHelperText error>Please enter a valid, non-negative cost for all suppliers.</FormHelperText> }
                 <FormHelperText>Click the star ☆ icon to set a supplier's cost as the default for profit calculations.</FormHelperText>
            </Grid>
            

            {/* Price, Quantity, Max Stock */}
             <Grid item size={{ xs: 6 }}><TextField fullWidth required type="number" name="price" label="Selling Price" value={formData.price} onChange={handleChange} inputProps={{ step: "0.01", min: 0 }} /></Grid>
             <Grid item size={{ xs: 6 }}> <TextField fullWidth required type="number" name="quantity" label="Current Qty" value={formData.quantity} onChange={handleChange} inputProps={{ min: 0 }} disabled={!!productToEdit} InputProps={productToEdit ? { endAdornment: ( <InputAdornment position="end"> <Tooltip title="Use 'Adjust Stock' button in the inventory list to change quantity."> <InfoOutlinedIcon color="action" /> </Tooltip> </InputAdornment> ) }: {}} /> {!!productToEdit && <FormHelperText>Quantity is managed via transactions. Use Adjust Stock for corrections.</FormHelperText>} </Grid>
             <Grid item size={{ xs: 6 }}> <TextField fullWidth required type="number" name="maxStock" label="Max Stock" value={formData.maxStock} onChange={handleChange} inputProps={{ min: 1 }} /> </Grid>
             
             {/* Status Dropdown */}
             {productToEdit && (user?.role === 'Super Admin' || user?.role === 'Admin') && (
                <Grid item size={{ xs: 6 }}>
                    <FormControl fullWidth required>
                        <InputLabel>Status</InputLabel>
                        <Select
                            name="status"
                            label="Status"
                            value={formData.status}
                            onChange={handleChange}
                        >
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                        </Select>
                        <FormHelperText>
                          {formData.status === 'active' ? 'Product is visible for sale.' : 'Product is archived and hidden from sale.'}
                        </FormHelperText>
                    </FormControl>
                </Grid>
             )}


            {/* Helper Text for Thresholds */}
            <Grid item size={{ xs: 12 }} sx={{ mt: -1.5, pl: 1, pr: 1 }}> {formData.maxStock > 0 && ( <FormHelperText> Thresholds based on {formData.maxStock} units: <strong> Low</strong> status at &le; {Math.floor(formData.maxStock * 0.25)} | <strong> Critical</strong> status at &le; {Math.floor(formData.maxStock * 0.10)} </FormHelperText> )} </Grid>

            {/* Image URL/Upload */}
            <Grid item size={{ xs: 12 }}>
              <FormControl fullWidth>
                <ToggleButtonGroup value={imageSource} exclusive onChange={(e, val) => val && setImageSource(val)} size="small">
                  <ToggleButton value="url">URL</ToggleButton>
                  <ToggleButton value="upload">Upload</ToggleButton>
                </ToggleButtonGroup>
                {imageSource === 'url' ? ( <TextField name="image" label="Image URL" value={formData.image} onChange={handleChange} sx={{ mt: 1 }} /> )
                 : ( <Box sx={{ mt: 1 }}> <Button variant="outlined" component="label" fullWidth> Upload File <input type="file" hidden onChange={handleImageUpload} accept="image/*" /> </Button>
                    {uploadedFileName && ( <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, color: 'success.main' }}> <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} /> <Typography variant="body2">{uploadedFileName}</Typography> </Box> )} </Box> )}
              </FormControl>
            </Grid>
          </Grid>
          
          {/* General Error Alert */}
          {error && !(error.includes('supplier') || error.includes('cost')) && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> }

          {/* Buttons */}
          <Stack 
            direction="row" 
            justifyContent={productToEdit && (user.role === 'Super Admin' || user.role === 'Admin') ? "space-between" : "flex-end"} 
            alignItems="center" 
            sx={{ mt: 3 }}
          >
            {productToEdit && (user.role === 'Super Admin' || user.role === 'Admin') && formData.status === 'active' && (
              <Button 
                color="warning" 
                onClick={handleArchive}
                startIcon={<ArchiveIcon />}
              >
                Archive Product
              </Button>
            )}
            
            <Stack direction="row" spacing={2}> 
              <Button onClick={onClose}>Cancel</Button> 
              <Button type="submit" variant="contained">
                {productToEdit ? 'Save Changes' : 'Add Product'}
              </Button> 
            </Stack>
          </Stack>
        </Box>
    </Box>
  );
};

export default ProductForm;