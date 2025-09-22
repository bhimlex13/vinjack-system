// client/src/pages/CustomersPage.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { getCustomers, deleteCustomer } from '../api/customerApi';
import CustomerForm from '../components/CustomerForm';
import CustomerMotorcyclesModal from '../components/CustomerMotorcyclesModal';
import ConfirmationContext from '../context/ConfirmationContext';
import { toast } from 'react-toastify';

// MUI Imports
import { Box, Button, Typography, Paper, Stack, Dialog, DialogTitle, Container } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import { FaUserFriends, FaMotorcycle } from 'react-icons/fa';

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [managingCustomer, setManagingCustomer] = useState(null);
  const { confirm } = useContext(ConfirmationContext);

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
    const isConfirmed = await confirm(
      'Are you sure you want to delete this customer?',
      'Deleting a customer with existing sales may affect historical records. This action cannot be undone.'
    );
    if (isConfirmed) {
      try {
        await deleteCustomer(customerId);
        toast.success('Customer deleted successfully.');
        fetchCustomers();
      } catch (err)
      {
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
      width: 300,
      sortable: false,
      renderCell: (params) => (
        // --- THIS IS THE FIX for vertical alignment ---
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
          }}
        >
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FaMotorcycle />}
              onClick={() => setManagingCustomer(params.row)}
            >
              Vehicles
            </Button>
            <Button variant="outlined" size="small" onClick={() => openModalForEdit(params.row)}>Edit</Button>
            <Button variant="outlined" size="small" color="error" onClick={() => handleDelete(params.row._id)}>Delete</Button>
          </Stack>
        </Box>
      )
    }
  ];

  return (
    <Container maxWidth="xl" sx={{ p: 3, mt: 2 }}>
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
        <CustomerForm
          onFormSubmit={handleFormSubmit}
          customerToEdit={editingCustomer}
          onClose={() => setIsModalOpen(false)}
        />
      </Dialog>

      {managingCustomer && (
          <CustomerMotorcyclesModal
            open={Boolean(managingCustomer)}
            onClose={() => setManagingCustomer(null)}
            customer={managingCustomer}
          />
      )}

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

      <Paper sx={{ height: '75vh', width: '100%' }}>
        <DataGrid
          rows={customers}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row._id}
        />
      </Paper>
    </Container>
  );
};

export default CustomersPage;