// client/src/components/MotorcycleForm.js
import React, { useState, useEffect, useContext } from 'react'; 
import ConfirmationContext from '../context/ConfirmationContext'; 
import { createMotorcycle, updateMotorcycle } from '../api/motorcycleApi';
import { toast } from 'react-toastify';

// MUI Imports
import { Box, TextField, Button, Stack, Alert, DialogContent, DialogActions } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';

const MotorcycleForm = ({ customer, motorcycleToEdit, onFormSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    make: '', model: '', year: '', color: '', plateNumber: '', vin: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { confirm } = useContext(ConfirmationContext); 

  useEffect(() => {
    if (motorcycleToEdit) {
      setFormData({
        make: motorcycleToEdit.make || '',
        model: motorcycleToEdit.model || '',
        year: motorcycleToEdit.year || '',
        color: motorcycleToEdit.color || '',
        plateNumber: motorcycleToEdit.plateNumber || '',
        vin: motorcycleToEdit.vin || '',
      });
    } else {
      setFormData({ make: '', model: '', year: '', color: '', plateNumber: '', vin: '' });
    }
  }, [motorcycleToEdit]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const getCleanedData = () => {
    return {
      ...formData,
      year: formData.year || null,
      plateNumber: formData.plateNumber.trim() === '' ? null : formData.plateNumber,
      vin: formData.vin.trim() === '' ? null : formData.vin,
    };
  };

  const validate = () => {
    if (!formData.make.trim() || !formData.model.trim()) {
        setError('Make and Model are required.');
        return false;
    }
    if (formData.year && (formData.year < 1900 || formData.year > new Date().getFullYear() + 1)) {
        setError('Please enter a valid 4-digit year.');
        return false;
    }
    return true;
  };

  const handleForceCreate = async () => {
    setIsSubmitting(true);
    setError('');
    const cleanedData = getCleanedData();
    const payload = { 
      ...cleanedData, 
      owner: customer._id, 
      forceCreate: true 
    };

    try {
      await createMotorcycle(payload);
      toast.success('Motorcycle added successfully!');
      onFormSubmit();
      onClose();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'An error occurred during the forced creation.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setError('');

    const cleanedData = getCleanedData();
    const payload = { ...cleanedData, owner: customer._id };

    try {
      if (motorcycleToEdit) {
        await updateMotorcycle(motorcycleToEdit._id, payload);
        toast.success('Motorcycle updated successfully!');
      } else {
        await createMotorcycle(payload);
        toast.success('Motorcycle added successfully!');
      }
      onFormSubmit();
      onClose();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'An error occurred.';
      
      // Handle Soft Duplicates (Similar bike exists)
      if (err.response?.status === 409 && err.response?.data?.isSoftDuplicate) {
        const userConfirmed = await confirm(
            "Similar Vehicle Found",
            `${errorMsg} Do you want to save it anyway?`
        ); 
        if (userConfirmed) {
          handleForceCreate(); 
          return; 
        }
      }
      
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DialogContent dividers>
        <Box component="form" id="motorcycle-form" onSubmit={handleSubmit}>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
          
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={2}>
                <TextField 
                    label="Make" 
                    name="make" 
                    value={formData.make} 
                    onChange={handleChange} 
                    required 
                    fullWidth 
                    variant="outlined"
                    size="small"
                    placeholder="e.g. Honda"
                />
                <TextField 
                    label="Model" 
                    name="model" 
                    value={formData.model} 
                    onChange={handleChange} 
                    required 
                    fullWidth 
                    variant="outlined"
                    size="small"
                    placeholder="e.g. Click 125i"
                />
            </Stack>

            <Stack direction="row" spacing={2}>
                <TextField 
                    label="Year" 
                    name="year" 
                    type="number" 
                    value={formData.year} 
                    onChange={handleChange} 
                    fullWidth 
                    variant="outlined"
                    size="small"
                    placeholder="e.g. 2023"
                />
                <TextField 
                    label="Color" 
                    name="color" 
                    value={formData.color} 
                    onChange={handleChange} 
                    fullWidth 
                    variant="outlined"
                    size="small"
                    placeholder="e.g. Matte Black"
                />
            </Stack>

            <TextField 
                label="Plate Number (Optional)" 
                name="plateNumber" 
                value={formData.plateNumber} 
                onChange={handleChange} 
                fullWidth 
                variant="outlined"
                size="small"
                placeholder="e.g. ABC 1234"
            />
            <TextField 
                label="VIN / Chassis Number (Optional)" 
                name="vin" 
                value={formData.vin} 
                onChange={handleChange} 
                fullWidth 
                variant="outlined"
                size="small"
                placeholder="Vehicle Identification Number"
            />
          </Stack>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting} color="inherit">Cancel</Button>
        <Button 
            type="submit" 
            form="motorcycle-form" 
            variant="contained" 
            disabled={isSubmitting}
            startIcon={!isSubmitting && <SaveIcon />}
        >
            {isSubmitting ? (motorcycleToEdit ? 'Updating...' : 'Saving...') : (motorcycleToEdit ? 'Update Vehicle' : 'Save Vehicle')}
        </Button>
      </DialogActions>
    </>
  );
};

export default MotorcycleForm;