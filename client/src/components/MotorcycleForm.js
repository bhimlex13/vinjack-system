// client/src/components/MotorcycleForm.js
import React, { useState, useEffect, useContext } from 'react'; 
import ConfirmationContext from '../context/ConfirmationContext'; 
import { createMotorcycle, updateMotorcycle } from '../api/motorcycleApi';
import { toast } from 'react-toastify';
import { Box, TextField, Button, Stack, Alert } from '@mui/material';
import { motion } from 'framer-motion'; // --- NEW IMPORT ---

// --- NEW IMPORT ---
import LoadingSpinner from './LoadingSpinner';

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
  };

  const getCleanedData = () => {
    return {
      ...formData,
      year: formData.year || null,
      plateNumber: formData.plateNumber.trim() === '' ? null : formData.plateNumber,
      vin: formData.vin.trim() === '' ? null : formData.vin,
    };
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
      
      if (err.response?.status === 409 && err.response?.data?.isSoftDuplicate) {
        const userConfirmed = await confirm(errorMsg); 
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
    <Box 
      component="form" 
      onSubmit={handleSubmit} 
      sx={{ p: 3, pt: 1 }}
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {/* --- WRAP FORM FIELDS IN MOTION DIV --- */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <Stack spacing={2}>
            <TextField label="Make (e.g., Honda)" name="make" value={formData.make} onChange={handleChange} required fullWidth />
            <TextField label="Model (e.g., Click 125i)" name="model" value={formData.model} onChange={handleChange} required fullWidth />
            <TextField label="Year" name="year" type="number" value={formData.year} onChange={handleChange} fullWidth />
            <TextField label="Color" name="color" value={formData.color} onChange={handleChange} fullWidth />
            <TextField label="Plate Number (Optional)" name="plateNumber" value={formData.plateNumber} onChange={handleChange} fullWidth />
            <TextField label="VIN (Optional)" name="vin" value={formData.vin} onChange={handleChange} fullWidth />
            <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? <LoadingSpinner text="" /> : (motorcycleToEdit ? 'Update' : 'Save')}
            </Button>
            </Stack>
        </Stack>
      </motion.div>
    </Box>
  );
};

export default MotorcycleForm;