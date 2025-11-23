// client/src/components/CustomerMotorcyclesModal.js
import React, { useState, useEffect, useCallback } from 'react';
import { getMotorcyclesByCustomer, deleteMotorcycle } from '../api/motorcycleApi';
import MotorcycleForm from './MotorcycleForm';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion'; // --- NEW IMPORT ---

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, Button, Box, Typography, List, ListItem,
  ListItemText, IconButton, Stack, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// --- NEW IMPORT ---
import LoadingSpinner from './LoadingSpinner';

const CustomerMotorcyclesModal = ({ open, onClose, customer }) => {
  const [motorcycles, setMotorcycles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingMotorcycle, setEditingMotorcycle] = useState(null);

  const fetchMotorcycles = useCallback(async () => {
    if (!customer) return;
    setIsLoading(true);
    try {
      const data = await getMotorcyclesByCustomer(customer._id);
      setMotorcycles(data);
    } catch (error) {
      toast.error('Failed to fetch motorcycles.');
    } finally {
      setIsLoading(false);
    }
  }, [customer]);

  useEffect(() => {
    if (open) {
      fetchMotorcycles();
    }
  }, [open, fetchMotorcycles]);
  
  const handleOpenFormForAdd = () => {
    setEditingMotorcycle(null);
    setIsFormModalOpen(true);
  };
  
  const handleOpenFormForEdit = (motorcycle) => {
    setEditingMotorcycle(motorcycle);
    setIsFormModalOpen(true);
  };
  
  const handleDelete = async (motorcycleId) => {
    if (window.confirm('Are you sure you want to delete this motorcycle?')) {
        try {
            await deleteMotorcycle(motorcycleId);
            toast.success('Motorcycle deleted.');
            fetchMotorcycles();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete motorcycle.');
        }
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>
          Manage Vehicles for: {customer?.name}
        </DialogTitle>
        <DialogContent>
          {/* --- USE LOADING SPINNER AND ANIMATION --- */}
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                <LoadingSpinner text="Loading Vehicles..." />
            </Box>
          ) : (
            <List component={motion.ul} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {motorcycles.length === 0 && (
                <Typography sx={{ textAlign: 'center', my: 2 }}>No vehicles registered for this customer.</Typography>
              )}
              <AnimatePresence>
                {motorcycles.map(moto => (
                  <motion.div 
                    key={moto._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ListItem
                        secondaryAction={
                        <Stack direction="row" spacing={1}>
                            <IconButton edge="end" aria-label="edit" onClick={() => handleOpenFormForEdit(moto)}>
                            <EditIcon />
                            </IconButton>
                            <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(moto._id)}>
                            <DeleteIcon />
                            </IconButton>
                        </Stack>
                        }
                    >
                        <ListItemText
                        primary={`${moto.make} ${moto.model}`}
                        secondary={`Plate: ${moto.plateNumber || 'N/A'} | Year: ${moto.year || 'N/A'} | Color: ${moto.color || 'N/A'}`}
                        />
                    </ListItem>
                    <Divider />
                  </motion.div>
                ))}
              </AnimatePresence>
            </List>
          )}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenFormForAdd}>
              Add New Motorcycle
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Nested Modal for the Form */}
      <AnimatePresence>
        {isFormModalOpen && (
            <Dialog open={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingMotorcycle ? 'Edit Motorcycle' : 'Add New Motorcycle'}</DialogTitle>
                <MotorcycleForm
                    customer={customer}
                    motorcycleToEdit={editingMotorcycle}
                    onFormSubmit={() => {
                        setIsFormModalOpen(false);
                        fetchMotorcycles();
                    }}
                    onClose={() => setIsFormModalOpen(false)}
                />
            </Dialog>
        )}
      </AnimatePresence>
    </>
  );
};

export default CustomerMotorcyclesModal;