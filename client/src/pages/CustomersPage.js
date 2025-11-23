// client/src/pages/CustomersPage.js
import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { getCustomers, deleteCustomer } from '../api/customerApi';
import CustomerForm from '../components/CustomerForm';
import CustomerMotorcyclesModal from '../components/CustomerMotorcyclesModal';
import ConfirmationContext from '../context/ConfirmationContext';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion'; // --- NEW IMPORT ---

// MUI Imports
import { 
  Box, Button, Typography, Paper, Stack, Dialog, DialogTitle, Container, 
  TextField, InputAdornment, 
  IconButton, 
  Tooltip,
  Grid
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { FaUserFriends, FaMotorcycle } from 'react-icons/fa';

// --- NEW IMPORT ---
import LoadingSpinner from '../components/LoadingSpinner';

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [managingCustomer, setManagingCustomer] = useState(null);
  const { confirm } = useContext(ConfirmationContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [motorcycleFilter, setMotorcycleFilter] = useState('');

  // --- FRAMER MOTION VARIANTS ---
  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };
  // ------------------------------

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error("Failed to fetch customers", err);
      toast.error('Failed to fetch customers.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const lowerCaseMotorcycleFilter = motorcycleFilter.toLowerCase();

    return customers.filter(customer => {
      const searchMatch = !lowerCaseSearchTerm ||
        (customer.name?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (customer.email?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (customer.phone?.toLowerCase().includes(lowerCaseSearchTerm));
      
      const motorcycleMatch = !lowerCaseMotorcycleFilter ||
        (customer.motorcycles && customer.motorcycles.some(
          moto => moto.make && moto.make.toLowerCase().includes(lowerCaseMotorcycleFilter)
        ));

      return searchMatch && motorcycleMatch;
    });
  }, [customers, searchTerm, motorcycleFilter]);

  const handleFormSubmit = () => {
    fetchCustomers();
  };

  const openModalForAdd = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const openModalForEdit = (customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleDelete = useCallback(async (customerId) => {
    try {
      await confirm(
        'Are you sure you want to delete this customer?',
        'Deleting a customer with existing sales may affect historical records. This action cannot be undone.'
      );
      await deleteCustomer(customerId);
      toast.success('Customer deleted successfully.');
      fetchCustomers();
    } catch (err)
    {
      if (err) { 
        console.error('Failed to delete customer', err);
        toast.error(err.response?.data?.message || 'Failed to delete customer.');
      }
    }
  }, [fetchCustomers, confirm]);

  const columns = [
    { field: 'name', headerName: 'Customer Name', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1, renderCell: (params) => params.value || 'N/A' },
    { field: 'phone', headerName: 'Phone Number', flex: 1, renderCell: (params) => params.value || 'N/A' },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="View Vehicles">
            <IconButton size="small" onClick={() => setManagingCustomer(params.row)}>
              <FaMotorcycle />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Customer">
            <IconButton size="small" onClick={() => openModalForEdit(params.row)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Customer">
            <IconButton size="small" color="error" onClick={() => handleDelete(params.row._id)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      )
    }
  ];

  // --- RENDER LOADING SPINNER IF FETCHING ---
  if (isLoading && customers.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <LoadingSpinner text="Loading Customers..." />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ p: 3, mt: 2 }}>
      
      {/* --- ANIMATED HEADER SECTION --- */}
      <motion.div initial="hidden" animate="visible" variants={pageVariants}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
              <FaUserFriends size={32} />
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                Customer Management
              </Typography>
          </Stack>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openModalForAdd}>
            Add Customer
          </Button>
        </Box>
        
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item size={{ xs: 12, md: 8 }}>
              <TextField
                label="Search Customers (by Name, Email, or Phone)"
                variant="outlined"
                size="small"
                fullWidth
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item size={{ xs: 12, md: 4 }}>
              <TextField
                label="Filter by Motorcycle Make (e.g., Honda)"
                variant="outlined"
                size="small"
                fullWidth
                value={motorcycleFilter}
                onChange={(e) => setMotorcycleFilter(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FaMotorcycle />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ height: '70vh', width: '100%' }}>
          <DataGrid
            rows={filteredCustomers} 
            columns={columns}
            loading={isLoading}
            getRowId={(row) => row._id}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[10, 25, 50]}
          />
        </Paper>
      </motion.div>

      {/* --- ANIMATED DIALOGS --- */}
      <AnimatePresence>
        {isModalOpen && (
          <Dialog 
            open={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            fullWidth 
            maxWidth="sm"
            // PaperProps={{ component: motion.div, initial: { y: 50, opacity: 0 }, animate: { y: 0, opacity: 1 } }} // Optional: Animate dialog entrance
          >
            <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
            <CustomerForm
              onFormSubmit={handleFormSubmit}
              customerToEdit={editingCustomer}
              onClose={() => setIsModalOpen(false)}
            />
          </Dialog>
        )}
      </AnimatePresence>

      {managingCustomer && (
          <CustomerMotorcyclesModal
            open={Boolean(managingCustomer)}
            onClose={() => setManagingCustomer(null)}
            customer={managingCustomer}
          />
      )}

    </Container>
  );
};

export default CustomersPage;