// client/src/components/ProductForm.js
import React, { useState, useEffect, useContext, useMemo } from 'react'; // <-- useMemo included
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
  ListItem // --- NEW: Optional ListItem ---
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'; // --- NEW: Icon for Add button ---
import DeleteIcon from '@mui/icons-material/Delete'; // --- NEW: Icon for Remove button ---

// --- Add Supplier Dialog Component ---
const AddSupplierDialog = ({ open, onClose, allSuppliers, assignedSupplierIds, onAddSuppliers }) => {
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);

  // Filter out already assigned suppliers from the options
  const availableSuppliers = useMemo(() => {
    return allSuppliers.filter(s => !assignedSupplierIds.includes(s._id));
  }, [allSuppliers, assignedSupplierIds]);

  const handleAdd = () => {
    onAddSuppliers(selectedSuppliers.map(s => s._id)); // Send back only the IDs
    setSelectedSuppliers([]); // Reset selection
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Suppliers to Product</DialogTitle>
      <DialogContent>
        <Autocomplete
          multiple
          sx={{ mt: 2 }}
          options={availableSuppliers}
          getOptionLabel={(option) => option.name || ''}
          value={selectedSuppliers}
          onChange={(event, newValue) => {
            setSelectedSuppliers(newValue);
          }}
          isOptionEqualToValue={(option, value) => option._id === value._id}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              label="Select Suppliers"
              placeholder="Choose suppliers..."
            />
          )}
        />
        {availableSuppliers.length === 0 && <Typography sx={{mt: 2, color: 'text.secondary'}}>All available suppliers are already assigned to this product.</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { setSelectedSuppliers([]); onClose(); }}>Cancel</Button>
        <Button onClick={handleAdd} variant="contained" disabled={selectedSuppliers.length === 0}>
          Add Selected
        </Button>
      </DialogActions>
    </Dialog>
  );
};


const ProductForm = ({ onFormSubmit, productToEdit, onClose, onProductDelete }) => {
  const { confirm } = useContext(ConfirmationContext); // Get confirm function from context
  const { user } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    itemCode: '', name: '', category: '', brand: '',
    cost: '', price: '', quantity: '', maxStock: '', image: '',
    suppliers: []
  });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageSource, setImageSource] = useState('url');
  const [uploadedFileName, setUploadedFileName] = useState('');

  // --- NEW: State for Add Supplier Dialog ---
  const [isAddSupplierDialogOpen, setIsAddSupplierDialogOpen] = useState(false);

  // Fetch dropdown data
  useEffect(() => {
    const fetchDropdownData = async () => {
      console.log("ProductForm: Fetching dropdown data...");
      setSupplierLoading(true); // Keep this for the dialog's Autocomplete
      try {
        const [catRes, brandRes, supRes] = await Promise.all([
          api.get('/categories'),
          api.get('/brands'),
          api.get('/suppliers')
        ]);
        setCategories(catRes.data);
        setBrands(brandRes.data);
        setAllSuppliers(supRes.data);
        console.log("ProductForm: All suppliers fetched:", supRes.data); // <-- Log fetched suppliers
      } catch (fetchError) {
        setError("Could not load form dropdown data.");
        toast.error("Failed to load categories, brands, or suppliers.");
      } finally {
        setSupplierLoading(false);
      }
    };
    fetchDropdownData();
  }, []);

  // Initialize form data (REVISED useEffect with detailed logging)
  useEffect(() => {
    console.log("--- ProductForm Init UseEffect START ---");
    console.log("productToEdit prop:", productToEdit); // Log the raw prop

    let initialSuppliers = []; // Start with empty array

    if (productToEdit && Array.isArray(productToEdit.suppliers)) {
        console.log("productToEdit.suppliers:", productToEdit.suppliers); // Log the suppliers array from prop

        initialSuppliers = productToEdit.suppliers
            .map(s => {
                const id = s?._id || s; // Get ID whether it's an object or string
                console.log(`  Mapping supplier item: ${JSON.stringify(s)}, extracted ID: ${id}`); // Log each item and extracted ID
                return id;
            })
            .filter(id => {
                const isValid = Boolean(id); // Filter out null/undefined explicitly
                console.log(`  Filtering ID: ${id}, isValid: ${isValid}`);
                return isValid;
            });
    } else if (productToEdit) {
        console.warn("productToEdit exists, but productToEdit.suppliers is not an array:", productToEdit.suppliers);
    }

    const initialData = productToEdit ? {
      itemCode: productToEdit.itemCode,
      name: productToEdit.name,
      category: productToEdit.category?._id || '',
      brand: productToEdit.brand?._id || '',
      cost: productToEdit.cost,
      price: productToEdit.price,
      quantity: productToEdit.quantity,
      maxStock: productToEdit.maxStock || '',
      image: productToEdit.image || '',
      suppliers: initialSuppliers, // Use the carefully extracted IDs
    } : {
      // ... (new product initial data) ...
      itemCode: '', name: '', category: '', brand: '',
      cost: '', price: '', quantity: '', maxStock: '', image: '',
      suppliers: []
    };
    console.log("Setting initial formData:", initialData); // Log the final initial data
    setFormData(initialData);

    // Reset image source (logic remains the same)
    setUploadedFileName('');
    if (productToEdit && productToEdit.image && !productToEdit.image.startsWith('data:image')) {
        setImageSource('url');
    } else if (productToEdit && productToEdit.image) {
        setImageSource('upload');
    } else {
        setImageSource('url');
    }
    console.log("--- ProductForm Init UseEffect END ---");
  }, [productToEdit]); // Dependency remains productToEdit


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- REMOVED handleSupplierChange for Autocomplete ---

  // --- NEW: Handlers for adding/removing suppliers ---
  const handleAddSuppliers = (supplierIdsToAdd) => {
    setFormData(prevData => ({
      ...prevData,
      // Use Set to prevent duplicates if user somehow adds the same one twice
      suppliers: [...new Set([...prevData.suppliers, ...supplierIdsToAdd])]
    }));
  };

  // --- MODIFIED handleRemoveSupplier with Confirmation ---
  const handleRemoveSupplier = async (supplierIdToRemove) => {
    // Find the supplier name for the confirmation message
    const supplierToRemove = allSuppliers.find(s => s._id === supplierIdToRemove);
    const supplierName = supplierToRemove ? supplierToRemove.name : 'this supplier';

    const isConfirmed = await confirm(
        'Remove Supplier?',
        `Are you sure you want to remove ${supplierName} from this product?`
    );

    if (isConfirmed) {
        setFormData(prevData => ({
          ...prevData,
          suppliers: prevData.suppliers.filter(id => id !== supplierIdToRemove)
        }));
        toast.info(`${supplierName} removed from product.`); // Optional feedback
    }
  };
  // --- END MODIFICATION ---


  const handleGenerateItemCode = () => { /* ... unchanged ... */
     const { name, category, brand } = formData;
    if (!name || !category || !brand) {
      toast.warn('Please fill in Product Name, Category, and Brand first.');
      return;
    }
    const categoryName = categories.find(c => c._id === category)?.name || 'CAT';
    const brandName = brands.find(b => b._id === brand)?.name || 'BRA';
    const namePart = name.substring(0, 3).toUpperCase();
    const catPart = categoryName.substring(0, 3).toUpperCase();
    const brandPart = brandName.substring(0, 3).toUpperCase();
    const uniquePart = Date.now().toString().slice(-4);
    const newItemCode = `${namePart}-${catPart}-${brandPart}-${uniquePart}`;
    setFormData({ ...formData, itemCode: newItemCode });
  };
  const resizeImage = (file, maxWidth, maxHeight) => { /* ... unchanged ... */
     return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } }
          else { if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; } }
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.9)); };
        img.onerror = (error) => reject(error); };
      reader.onerror = (error) => reject(error);
    });
   };
  const handleImageUpload = async (e) => { /* ... unchanged ... */
     const file = e.target.files[0];
    if (file) {
      setUploadedFileName(file.name);
      try {
        const resizedImage = await resizeImage(file, 800, 800);
        setFormData({ ...formData, image: resizedImage });
        toast.success("Image ready for upload.");
      } catch (error) {
        setError("Failed to process image. Please try another file.");
        setUploadedFileName('');
      }
    }
   };

  const handleSubmit = async (e) => { /* ... unchanged ... */
    e.preventDefault();
    if (!productToEdit && (!formData.suppliers || formData.suppliers.length === 0)) {
       setError('Please assign at least one supplier to this new product.');
       toast.warn('Please assign at least one supplier.');
       return;
    }
    const dataToSend = { ...formData };
    if (productToEdit) {
      delete dataToSend.quantity;
    }
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

  const handleDelete = async () => { /* ... unchanged ... */
     const isConfirmed = await confirm('Permanently delete this product? This action cannot be undone.');
    if (isConfirmed) {
      try {
        await api.delete(`/products/${productToEdit._id}`);
        toast.success('Product deleted successfully!');
        onProductDelete(productToEdit._id);
        onClose();
      } catch (err) {
         setError(err.response?.data?.message || 'Failed to delete product.');
         toast.error(err.response?.data?.message || 'Failed to delete product.');
      }
    }
  };

  // --- Helper to get supplier OBJECTS from IDs for display (WITH DETAILED LOGGING) ---
  const getAssignedSupplierDetails = useMemo(() => {
    console.log("ProductForm: Calculating assigned supplier DETAILS...");
    console.log("  formData.suppliers (IDs):", JSON.stringify(formData.suppliers));
    console.log("  allSuppliers available:", allSuppliers.length);

    if (!formData.suppliers || formData.suppliers.length === 0 || !allSuppliers || allSuppliers.length === 0) {
      console.log("  -> Returning [] (No assigned IDs or allSuppliers not loaded yet)");
      return [];
    }

    const assignedDetails = formData.suppliers
      .map(id => {
          // --- DETAILED LOGGING INSIDE MAP ---
          console.log(`  -> Trying to find ID: ${id} (Type: ${typeof id})`);
          const foundSupplier = allSuppliers.find(s => {
              // Log the comparison values
              const s_id_str = String(s._id);
              const id_str = String(id);
              console.log(`     Comparing form ID: '${id_str}' (Type: ${typeof id_str}) with supplier list ID: '${s_id_str}' (Type: ${typeof s_id_str})`);
              // Use string comparison
              return s_id_str === id_str;
          });
          // --- END DETAILED LOGGING ---
          if (!foundSupplier) {
              console.warn(`  -> Supplier with ID ${id} not found in allSuppliers list.`);
          }
          return foundSupplier;
      })
      .filter(Boolean);

    console.log("  -> Found supplier details:", assignedDetails);
    return assignedDetails;
  }, [formData.suppliers, allSuppliers]);


  return (
    <Box sx={{ minWidth: 500, p: 3, pt: 1 }}>
        {/* --- Add Supplier Dialog --- */}
        <AddSupplierDialog
            open={isAddSupplierDialogOpen}
            onClose={() => setIsAddSupplierDialogOpen(false)}
            allSuppliers={allSuppliers}
            assignedSupplierIds={formData.suppliers}
            onAddSuppliers={handleAddSuppliers}
        />

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            {/* Item Code (Disabled on Edit) */}
            <Grid item size={{ xs: 12 }}>
              <TextField
                fullWidth required name="itemCode" label="Item Code" value={formData.itemCode} onChange={handleChange}
                disabled={!!productToEdit}
                InputProps={{ /* ... adornment ... */
                   endAdornment: ( <InputAdornment position="end"> <Tooltip title="Generate Unique Item Code">
                      <IconButton onClick={handleGenerateItemCode} edge="end" disabled={!!productToEdit}>
                         <AutoFixHighIcon />
                      </IconButton>
                    </Tooltip> </InputAdornment> )
                 }}
              />
              {!!productToEdit && <FormHelperText>Item Code cannot be changed after creation.</FormHelperText>}
            </Grid>
            {/* Product Name */}
            <Grid item size={{ xs: 12 }}><TextField fullWidth required name="name" label="Product Name" value={formData.name} onChange={handleChange} /></Grid>

            {/* Category & Brand */}
            <Grid item size={{ xs: 6 }}>
              <FormControl fullWidth required><InputLabel>Category</InputLabel>
                <Select name="category" label="Category" value={formData.category} onChange={handleChange}>
                  {categories.map(c => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item size={{ xs: 6 }}>
              <FormControl fullWidth required><InputLabel>Brand</InputLabel>
                <Select name="brand" label="Brand" value={formData.brand} onChange={handleChange}>
                  {brands.map(b => <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            {/* --- NEW: Supplier Display Area --- */}
            <Grid item size={{ xs: 12 }}>
                <Typography variant="subtitle2" gutterBottom>Assigned Suppliers</Typography>
                <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1, minHeight: '56px', alignItems: 'center' }}>
                    {/* --- Use the result of the useMemo hook --- */}
                    {getAssignedSupplierDetails.length > 0 ? (
                        getAssignedSupplierDetails.map(supplier => (
                            <Chip
                                key={supplier._id}
                                label={supplier.name}
                                onDelete={() => handleRemoveSupplier(supplier._id)} // <-- Now calls async handler with confirmation
                                deleteIcon={<DeleteIcon />}
                            />
                        ))
                    ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ml: 1}}>No suppliers assigned yet.</Typography>
                    )}
                </Paper>
                <Button
                    size="small"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={() => setIsAddSupplierDialogOpen(true)}
                    sx={{ mt: 1 }}
                    disabled={supplierLoading} // Disable if still loading all suppliers
                >
                    Add Supplier
                </Button>
                {/* Show validation error specifically for suppliers if adding */}
                {!productToEdit && formData.suppliers.length === 0 && error.includes('supplier') &&
                  <FormHelperText error>{error}</FormHelperText>
                }
            </Grid>
            {/* --- END Supplier Display Area --- */}

            {/* Cost & Price */}
            <Grid item size={{ xs: 6 }}><TextField fullWidth required type="number" name="cost" label="Cost" value={formData.cost} onChange={handleChange} inputProps={{ step: "0.01", min: 0 }} /></Grid>
            <Grid item size={{ xs: 6 }}><TextField fullWidth required type="number" name="price" label="Price" value={formData.price} onChange={handleChange} inputProps={{ step: "0.01", min: 0 }} /></Grid>

            {/* Quantity (Disabled on Edit) & Max Stock */}
            <Grid item size={{ xs: 6 }}>
              <TextField
                fullWidth required type="number" name="quantity" label="Current Qty" value={formData.quantity} onChange={handleChange}
                inputProps={{ min: 0 }} disabled={!!productToEdit}
                InputProps={productToEdit ? { /* ... adornment ... */ endAdornment: ( <InputAdornment position="end"> <Tooltip title="Use 'Adjust Stock' button in the inventory list to change quantity.">
                         <InfoOutlinedIcon color="action" />
                       </Tooltip> </InputAdornment> ) }: {}}
              />
              {!!productToEdit && <FormHelperText>Quantity is managed via transactions. Use Adjust Stock for corrections.</FormHelperText>}
            </Grid>
            <Grid item size={{ xs: 6 }}>
                <TextField fullWidth required type="number" name="maxStock" label="Max Stock" value={formData.maxStock} onChange={handleChange} inputProps={{ min: 1 }} />
            </Grid>

            {/* Helper Text for Thresholds */}
            <Grid item size={{ xs: 12 }} sx={{ mt: -1.5, pl: 1, pr: 1 }}>
              {formData.maxStock > 0 && (
                <FormHelperText> Thresholds based on {formData.maxStock} units: <strong> Low</strong> status at &le; {Math.floor(formData.maxStock * 0.25)} | <strong> Critical</strong> status at &le; {Math.floor(formData.maxStock * 0.10)} </FormHelperText>
              )}
            </Grid>

            {/* Image URL/Upload */}
            <Grid item size={{ xs: 12 }}>
              <FormControl fullWidth>
                <ToggleButtonGroup value={imageSource} exclusive onChange={(e, val) => val && setImageSource(val)} size="small">
                  <ToggleButton value="url">URL</ToggleButton>
                  <ToggleButton value="upload">Upload</ToggleButton>
                </ToggleButtonGroup>
                {imageSource === 'url' ? (
                  <TextField name="image" label="Image URL" value={formData.image} onChange={handleChange} sx={{ mt: 1 }} />
                 ) : (
                  <Box sx={{ mt: 1 }}>
                    <Button variant="outlined" component="label" fullWidth> Upload File <input type="file" hidden onChange={handleImageUpload} accept="image/*" /> </Button>
                    {uploadedFileName && ( <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, color: 'success.main' }}> <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} /> <Typography variant="body2">{uploadedFileName}</Typography> </Box> )}
                  </Box>
                 )}
              </FormControl>
            </Grid>
          </Grid>
          {/* --- End Grid --- */}

          {/* Show general error OR supplier validation error if applicable */}
          {error && !(!productToEdit && formData.suppliers.length === 0 && error.includes('supplier')) &&
            <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
          }

          <Stack direction="row" justifyContent={productToEdit && user.role === 'Owner' ? "space-between" : "flex-end"} alignItems="center" sx={{ mt: 3 }}>
            {productToEdit && user.role === 'Owner' && <Button color="error" onClick={handleDelete}>Delete Product</Button>}
            <Stack direction="row" spacing={2}>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="contained">{productToEdit ? 'Save Changes' : 'Add Product'}</Button>
            </Stack>
          </Stack>
        </Box>
    </Box>
  );
};

export default ProductForm;