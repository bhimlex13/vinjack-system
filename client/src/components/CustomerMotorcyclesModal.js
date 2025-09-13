// client/src/components/CustomerMotorcyclesModal.js
import React, { useState, useEffect, useCallback } from 'react'; // Import useCallback
import { getMotorcyclesByCustomer, deleteMotorcycle } from '../api/motorcycleApi';
import MotorcycleForm from './MotorcycleForm';
import { toast } from 'react-toastify';

// MUI Imports
import {
  Dialog, DialogTitle, DialogContent, Button, Box, Typography, List, ListItem,
  ListItemText, IconButton, CircularProgress, Stack, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const CustomerMotorcyclesModal = ({ open, onClose, customer }) => {
  const [motorcycles, setMotorcycles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingMotorcycle, setEditingMotorcycle] = useState(null);

  // Wrap fetchMotorcycles in useCallback
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
  }, [customer]); // Add customer as a dependency

  // Add fetchMotorcycles to the dependency array
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
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>
          ) : (
            <List>
              {motorcycles.length === 0 && (
                <Typography sx={{ textAlign: 'center', my: 2 }}>No vehicles registered for this customer.</Typography>
              )}
              {motorcycles.map(moto => (
                <React.Fragment key={moto._id}>
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
                </React.Fragment>
              ))}
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
    </>
  );
};

export default CustomerMotorcyclesModal;