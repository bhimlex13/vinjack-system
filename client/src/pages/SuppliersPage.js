// client/src/pages/SuppliersPage.js
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import SupplierForm from '../components/SupplierForm';

// MUI Imports
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Stack,
  Dialog,
  DialogTitle
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/suppliers');
      setSuppliers(response.data);
    } catch (err) {
      console.error("Failed to fetch suppliers", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = () => {
    fetchSuppliers();
  };

  const openSupplierModalForAdd = () => {
    setEditingSupplier(null);
    setIsSupplierModalOpen(true);
  };
  
  const openSupplierModalForEdit = (supplier) => {
    setEditingSupplier(supplier);
    setIsSupplierModalOpen(true);
  };

  const handleDelete = async (supplierId) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await api.delete(`/suppliers/${supplierId}`);
        fetchSuppliers();
      } catch (err) {
        console.error('Failed to delete supplier', err);
      }
    }
  };

  const columns = [
    { field: 'name', headerName: 'Supplier Name', flex: 1 },
    { 
      field: 'contactPerson', 
      headerName: 'Contact Person', 
      flex: 1, 
      renderCell: (params) => params.row.contactPerson || 'N/A' 
    },
    { 
      field: 'contactNumber', 
      headerName: 'Contact Number', 
      flex: 1, 
      renderCell: (params) => params.row.contactNumber || 'N/A' 
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" onClick={() => openSupplierModalForEdit(params.row)}>Edit</Button>
          <Button variant="outlined" size="small" color="error" onClick={() => handleDelete(params.row._id)}>Delete</Button>
        </Stack>
      )
    }
  ];

  return (
    // Use a Box instead of a Fragment to apply padding
    <Box sx={{ p: 3 }}>
      <Dialog 
        open={isSupplierModalOpen} 
        onClose={() => setIsSupplierModalOpen(false)} 
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
        <SupplierForm
          onFormSubmit={handleFormSubmit}
          supplierToEdit={editingSupplier}
          onClose={() => setIsSupplierModalOpen(false)}
        />
      </Dialog>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Supplier Management
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openSupplierModalForAdd}>
            Add Supplier
          </Button>
        </Stack>
      </Box>

      <Paper sx={{ height: '75vh', width: '100%' }}>
        <DataGrid
          rows={suppliers}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row._id}
        />
      </Paper>
    </Box>
  );
};

export default SuppliersPage;