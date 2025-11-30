// client/src/components/CustomerMotorcyclesModal.js
import React, { useState, useEffect, useCallback } from 'react';
import { getMotorcyclesByCustomer, deleteMotorcycle } from '../api/motorcycleApi';
import MotorcycleForm from './MotorcycleForm';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, Button, Box, Typography, List, ListItem,
  ListItemText, IconButton, Stack, Divider, useTheme
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';

import LoadingSpinner from './LoadingSpinner';

const CustomerMotorcyclesModal = ({ open, onClose, customer }) => {
  const [motorcycles, setMotorcycles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingMotorcycle, setEditingMotorcycle] = useState(null);
  const theme = useTheme();

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
      <Dialog 
        open={open} 
        onClose={onClose} 
        fullWidth 
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <DirectionsBikeIcon color="primary" /> 
          Vehicles: {customer?.name}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ minHeight: 300, p: 0 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                <LoadingSpinner text="Loading Vehicles..." />
            </Box>
          ) : (
            <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleOpenFormForAdd}>
                    Add Vehicle
                    </Button>
                </Box>

                <List component={motion.ul} initial={{ opacity: 0 }} animate={{ opacity: 1 }} disablePadding>
                {motorcycles.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4, opacity: 0.6 }}>
                        <DirectionsBikeIcon sx={{ fontSize: 48, mb: 1, color: 'text.disabled' }} />
                        <Typography variant="body2">No vehicles registered yet.</Typography>
                    </Box>
                ) : (
                    <AnimatePresence mode='popLayout'>
                        {motorcycles.map(moto => (
                        <motion.div 
                            key={moto._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ListItem
                                sx={{ 
                                    bgcolor: 'background.paper', 
                                    mb: 1, 
                                    borderRadius: 2, 
                                    border: `1px solid ${theme.palette.divider}`,
                                    '&:hover': { bgcolor: 'action.hover' }
                                }}
                                secondaryAction={
                                <Stack direction="row" spacing={0.5}>
                                    <IconButton size="small" onClick={() => handleOpenFormForEdit(moto)} sx={{ color: 'info.main' }}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => handleDelete(moto._id)} sx={{ color: 'error.main' }}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
                                }
                            >
                                <ListItemText
                                    primary={
                                        <Typography variant="subtitle2" fontWeight={700}>
                                            {moto.make} {moto.model}
                                        </Typography>
                                    }
                                    secondary={
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', gap: 1 }}>
                                            <span><strong>Plate:</strong> {moto.plateNumber || 'N/A'}</span>
                                            {moto.year && <span>• <strong>Year:</strong> {moto.year}</span>}
                                        </Typography>
                                    }
                                />
                            </ListItem>
                        </motion.div>
                        ))}
                    </AnimatePresence>
                )}
                </List>
            </Box>
          )}
        </DialogContent>
        <Divider />
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={onClose} color="inherit">Close</Button>
        </Box>
      </Dialog>

      {/* Nested Modal for the Form */}
      <AnimatePresence>
        {isFormModalOpen && (
            <Dialog 
                open={isFormModalOpen} 
                onClose={() => setIsFormModalOpen(false)} 
                maxWidth="xs" 
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>{editingMotorcycle ? 'Edit Motorcycle' : 'Add New Motorcycle'}</DialogTitle>
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