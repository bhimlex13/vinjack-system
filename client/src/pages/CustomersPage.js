// client/src/pages/CustomersPage.js
import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { getCustomers, deleteCustomer } from '../api/customerApi';
import CustomerForm from '../components/CustomerForm';
import CustomerMotorcyclesModal from '../components/CustomerMotorcyclesModal';
import ConfirmationContext from '../context/ConfirmationContext';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

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
    { field: 'name', headerName: 'Customer Name', flex: 1, minWidth: 150 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200, renderCell: (params) => params.value || 'N/A' },
    { field: 'phone', headerName: 'Phone Number', flex: 1, minWidth: 150, renderCell: (params) => params.value || 'N/A' },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Stack direction="row" spacing={1} justifyContent="center" width="100%">
          <Tooltip title="View Vehicles">
            <IconButton size="small" onClick={() => setManagingCustomer(params.row)} sx={{ color: 'primary.main', bgcolor: 'primary.50' }}>
              <FaMotorcycle size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Customer">
            <IconButton size="small" onClick={() => openModalForEdit(params.row)} sx={{ color: 'info.main', bgcolor: 'info.50' }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Customer">
            <IconButton size="small" color="error" onClick={() => handleDelete(params.row._id)} sx={{ bgcolor: 'error.50' }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )
    }
  ];

  if (isLoading && customers.length === 0) {
    return <LoadingSpinner text="Loading Customers..." />;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <motion.div initial="hidden" animate="visible" variants={pageVariants}>
        
        {/* Header */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 3, gap: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
             <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.dark', display: 'flex' }}>
                <FaUserFriends size={24} />
             </Box>
             <Box>
                <Typography variant="h5" fontWeight={700}>Customer Management</Typography>
                <Typography variant="body2" color="text.secondary">Manage customer profiles and vehicle records</Typography>
             </Box>
          </Stack>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={openModalForAdd} 
            sx={{ fontWeight: 600, px: 3, py: 1, width: { xs: '100%', sm: 'auto' } }}
          >
            Add Customer
          </Button>
        </Box>
        
        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 2 }}>
          <Grid container spacing={2}>
            {/* Standard V2 Grid Syntax */}
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                label="Search Customers"
                placeholder="Search by Name, Email, or Phone..."
                variant="outlined"
                size="small"
                fullWidth
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2 }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Filter by Motorcycle"
                placeholder="e.g. Honda, Yamaha..."
                variant="outlined"
                size="small"
                fullWidth
                value={motorcycleFilter}
                onChange={(e) => setMotorcycleFilter(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FaMotorcycle color="gray" />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2 }
                }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Data Grid */}
        <Paper sx={{ height: 600, width: '100%', borderRadius: 3, boxShadow: 3, overflow: 'hidden' }}>
          <DataGrid
            rows={filteredCustomers} 
            columns={columns}
            loading={isLoading}
            getRowId={(row) => row._id}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            sx={{
              border: 0,
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'grey.50',
                fontWeight: 700,
                fontSize: '0.9rem'
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'action.hover'
              }
            }}
          />
        </Paper>
      </motion.div>

      {/* Dialogs */}
      <AnimatePresence>
        {isModalOpen && (
          <Dialog 
            open={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            fullWidth 
            maxWidth="sm"
            PaperProps={{ sx: { borderRadius: 3 } }}
          >
            <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
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