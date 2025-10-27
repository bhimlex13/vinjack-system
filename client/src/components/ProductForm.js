// client/src/components/ProductForm.js
import React, { useState, useEffect, useContext, useMemo } from 'react';
import api from '../api/axios';
import ConfirmationContext from '../context/ConfirmationContext'; // Make sure this is imported
import AuthContext from '../context/AuthContext';
import { toast } from 'react-toastify';

// MUI Imports
import {
  Box, Button, TextField, FormControl, InputLabel, Select, MenuItem,
  Grid, ToggleButtonGroup, ToggleButton, Alert, Stack, InputAdornment, IconButton,
  Typography, Tooltip, FormHelperText,
  Autocomplete, // Still needed for the modal
  CircularProgress,
  Dialog, // --- NEW: Dialog components ---
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper, // --- NEW: Paper for supplier list ---
  Chip, // --- NEW: Chip for displaying suppliers ---
  List, // --- NEW: Optional List for better structure ---
  ListItem, // --- NEW: Optional ListItem ---
  Divider
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'; // --- NEW: Icon for Add button ---
import DeleteIcon from '@mui/icons-material/Delete'; // --- NEW: Icon for Remove button ---
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import StarIcon from '@mui/icons-material/Star'; // --- NEW: Icon for default ---
import StarBorderIcon from '@mui/icons-material/StarBorder'; // --- NEW: Icon for non-default ---

// Add Supplier Dialog Component (remains the same)
const AddSupplierDialog = ({ open, onClose, allSuppliers, assignedSupplierIds, onAddSuppliers }) => {
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const availableSuppliers = useMemo(() => {
    return allSuppliers.filter(s => !assignedSupplierIds.includes(s._id));
  }, [allSuppliers, assignedSupplierIds]);
  const handleAdd = () => {
    // Pass back full supplier objects initially
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


const ProductForm = ({ onFormSubmit, productToEdit, onClose, onProductDelete }) => {
  const { confirm } = useContext(ConfirmationContext); // Get confirm function from context
  const { user } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    itemCode: '', name: '', category: '', brand: '',
    price: '', quantity: '', maxStock: '', image: '',
    defaultCost: 0, // Keep this
    supplierCosts: []
  });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [supplierLoading, setSupplierLoading] = useState(false);
  // --- State to track if dropdowns are loaded ---
  const [dropdownsLoaded, setDropdownsLoaded] = useState(false);
  // ---
  const [error, setError] = useState('');
  const [imageSource, setImageSource] = useState('url');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isAddSupplierDialogOpen, setIsAddSupplierDialogOpen] = useState(false);

  // Fetch dropdown data
  useEffect(() => {
     const fetchDropdownData = async () => {
      console.log("ProductForm: Fetching dropdown data...");
      setSupplierLoading(true);
      setDropdownsLoaded(false); // Reset loading state
      try {
        const [catRes, brandRes, supRes] = await Promise.all([
          api.get('/categories'),
          api.get('/brands'),
          api.get('/suppliers')
        ]);
        setCategories(catRes.data);
        setBrands(brandRes.data);
        setAllSuppliers(supRes.data);
        setDropdownsLoaded(true); // Mark as loaded
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
    console.log("--- ProductForm Init UseEffect START ---");
    console.log("productToEdit prop:", productToEdit);

    const initialData = productToEdit ? {
      itemCode: productToEdit.itemCode, name: productToEdit.name, category: productToEdit.category?._id || '',
      brand: productToEdit.brand?._id || '', price: productToEdit.price, quantity: productToEdit.quantity,
      maxStock: productToEdit.maxStock || '', image: productToEdit.image || '',
      defaultCost: productToEdit.defaultCost || 0,
      supplierCosts: Array.isArray(productToEdit.supplierCosts) ? productToEdit.supplierCosts.map(sc => ({ supplier: sc.supplier?._id || sc.supplier, cost: sc.cost || 0 })).filter(sc => sc.supplier) : [],
    } : { itemCode: '', name: '', category: '', brand: '', price: '', quantity: '', maxStock: '', image: '', defaultCost: 0, supplierCosts: [] };
    console.log("Setting initial formData:", initialData);
    setFormData(initialData); setUploadedFileName('');
    if (productToEdit && productToEdit.image && !productToEdit.image.startsWith('data:image')) { setImageSource('url'); } else if (productToEdit && productToEdit.image) { setImageSource('upload'); } else { setImageSource('url'); }
     console.log("--- ProductForm Init UseEffect END ---");
  }, [productToEdit]);


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
   };

  // Handler for supplier cost changes
  const handleSupplierCostChange = (supplierId, newCost) => {
      setFormData(prevData => ({ ...prevData, supplierCosts: prevData.supplierCosts.map(sc => sc.supplier === supplierId ? { ...sc, cost: newCost === '' ? '' : Number(newCost) } : sc ) }));
   };

   // Handler to set default cost
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

  // Add newly selected suppliers
  const handleAddSuppliers = (suppliersToAdd) => {
      const newSupplierCosts = suppliersToAdd.map(supplierObj => ({ supplier: supplierObj._id, cost: '' }));
      setFormData(prevData => { const existingSupplierIds = new Set(prevData.supplierCosts.map(sc => sc.supplier)); const trulyNewSupplierCosts = newSupplierCosts.filter(nsc => !existingSupplierIds.has(nsc.supplier)); return { ...prevData, supplierCosts: [...prevData.supplierCosts, ...trulyNewSupplierCosts] } });
   };

  // Remove supplier with confirmation
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
    const invalidCostEntry = formData.supplierCosts.find(sc => sc.cost === '' || isNaN(sc.cost) || Number(sc.cost) < 0);
    if (invalidCostEntry) { setError(`Please enter a valid, non-negative cost for all assigned suppliers.`); toast.warn(`Please enter a valid cost for all suppliers.`); return; }
    if (!productToEdit && (!formData.supplierCosts || formData.supplierCosts.length === 0)) { setError('Please assign at least one supplier and set their cost.'); toast.warn('Please assign at least one supplier and set their cost.'); return; }
    const dataToSend = { ...formData }; if (productToEdit) { delete dataToSend.quantity; }
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

  const handleDelete = async () => {
     const isConfirmed = await confirm('Permanently delete this product? This action cannot be undone.');
    if (isConfirmed) {
      try { await api.delete(`/products/${productToEdit._id}`); toast.success('Product deleted successfully!'); onProductDelete(productToEdit._id); onClose(); }
      catch (err) { setError(err.response?.data?.message || 'Failed to delete product.'); toast.error(err.response?.data?.message || 'Failed to delete product.'); }
    }
  };

  // Helper to get supplier OBJECTS + COST for display
  const getAssignedSupplierDetailsWithCost = useMemo(() => {
      if (!formData.supplierCosts || formData.supplierCosts.length === 0 || !allSuppliers || allSuppliers.length === 0) { return []; }
      return formData.supplierCosts.map(sc => { const supplierDetails = allSuppliers.find(s => String(s._id) === String(sc.supplier)); if (!supplierDetails) return null; return { ...supplierDetails, cost: sc.cost }; }).filter(Boolean);
  }, [formData.supplierCosts, allSuppliers]);


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
             <Grid item size={{ xs: 12 }}> {/* Item Code */} <TextField fullWidth required name="itemCode" label="Item Code" value={formData.itemCode} onChange={handleChange} disabled={!!productToEdit} InputProps={{ endAdornment: ( <InputAdornment position="end"> <Tooltip title="Generate Unique Item Code"><IconButton onClick={handleGenerateItemCode} edge="end" disabled={!!productToEdit}> <AutoFixHighIcon /> </IconButton></Tooltip> </InputAdornment> ) }} /> {!!productToEdit && <FormHelperText>Item Code cannot be changed after creation.</FormHelperText>} </Grid>
             <Grid item size={{ xs: 12 }}><TextField fullWidth required name="name" label="Product Name" value={formData.name} onChange={handleChange} /></Grid>

            {/* --- Category & Brand Select (with conditional value) --- */}
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
            {/* --- END Category & Brand --- */}


            {/* --- Supplier Display Area with Default Cost Button --- */}
            <Grid item size={{ xs: 12 }}>
                <Typography variant="subtitle2" gutterBottom>Assigned Suppliers & Costs</Typography>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                    {getAssignedSupplierDetailsWithCost.length > 0 ? (
                        <List dense disablePadding>
                            {getAssignedSupplierDetailsWithCost.map((supplier, index) => {
                                const isDefault = Number(supplier.cost) === Number(formData.defaultCost) && Number(supplier.cost) >= 0 && supplier.cost !== '';
                                return (
                                    <React.Fragment key={supplier._id}>
                                        <ListItem sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, px: 0 }}>
                                            <Typography sx={{ flexShrink: 0, minWidth: '100px', mr: 1 }}>{supplier.name}</Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {/* Star Button */}
                                                <Tooltip title={isDefault ? "This is the default cost" : "Set as default cost"}>
                                                    <span> {/* Wrapper for Tooltip on disabled button */}
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
                                                {/* Cost Input */}
                                                <TextField
                                                    size="small" label="Cost" type="number" required
                                                    value={supplier.cost ?? ''} // Use ?? '' as fallback
                                                    onChange={(e) => handleSupplierCostChange(supplier._id, e.target.value)}
                                                    inputProps={{ step: "0.01", min: 0 }} sx={{ width: '120px' }}
                                                    InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
                                                />
                                                {/* Remove Button */}
                                                <Tooltip title={`Remove ${supplier.name}`}>
                                                    <IconButton onClick={() => handleRemoveSupplier(supplier._id)} size="small" color="error">
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </ListItem>
                                        {index < getAssignedSupplierDetailsWithCost.length - 1 && <Divider component="li" />}
                                    </React.Fragment>
                                );
                            })}
                        </List>
                    ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ml: 1}}>No suppliers assigned yet.</Typography>
                    )}
                </Paper>
                {/* Add Supplier Button & Helper Texts */}
                 <Button size="small" startIcon={<AddCircleOutlineIcon />} onClick={() => setIsAddSupplierDialogOpen(true)} sx={{ mt: 1 }} disabled={supplierLoading} > Add Supplier </Button>
                 {(!productToEdit && (!formData.supplierCosts || formData.supplierCosts.length === 0)) && (error.includes('supplier') || error.includes('cost')) && <FormHelperText error>{error}</FormHelperText> }
                 {formData.supplierCosts.some(sc => sc.cost === '' || isNaN(sc.cost) || Number(sc.cost) < 0) && <FormHelperText error>Please enter a valid, non-negative cost for all suppliers.</FormHelperText> }
                 <FormHelperText>Click the star ☆ icon to set a supplier's cost as the default for profit calculations.</FormHelperText>
            </Grid>
            {/* --- END Supplier Display Area --- */}


            {/* Price, Quantity, Max Stock */}
             <Grid item size={{ xs: 6 }}><TextField fullWidth required type="number" name="price" label="Selling Price" value={formData.price} onChange={handleChange} inputProps={{ step: "0.01", min: 0 }} /></Grid>
             <Grid item size={{ xs: 6 }}> <TextField fullWidth required type="number" name="quantity" label="Current Qty" value={formData.quantity} onChange={handleChange} inputProps={{ min: 0 }} disabled={!!productToEdit} InputProps={productToEdit ? { endAdornment: ( <InputAdornment position="end"> <Tooltip title="Use 'Adjust Stock' button in the inventory list to change quantity."> <InfoOutlinedIcon color="action" /> </Tooltip> </InputAdornment> ) }: {}} /> {!!productToEdit && <FormHelperText>Quantity is managed via transactions. Use Adjust Stock for corrections.</FormHelperText>} </Grid>
             <Grid item size={{ xs: 6 }}> <TextField fullWidth required type="number" name="maxStock" label="Max Stock" value={formData.maxStock} onChange={handleChange} inputProps={{ min: 1 }} /> </Grid>

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
          {/* --- End Grid --- */}

          {/* General Error Alert */}
          {error && !(error.includes('supplier') || error.includes('cost')) && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> }

          {/* Buttons */}
          <Stack direction="row" justifyContent={productToEdit && user.role === 'Owner' ? "space-between" : "flex-end"} alignItems="center" sx={{ mt: 3 }}>
            {productToEdit && user.role === 'Owner' && <Button color="error" onClick={handleDelete}>Delete Product</Button>}
            <Stack direction="row" spacing={2}> <Button onClick={onClose}>Cancel</Button> <Button type="submit" variant="contained">{productToEdit ? 'Save Changes' : 'Add Product'}</Button> </Stack>
          </Stack>
        </Box>
    </Box>
  );
};

export default ProductForm;