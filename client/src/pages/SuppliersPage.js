// client/src/pages/SuppliersPage.js
import React, { useState, useEffect, useContext } from 'react';
import { getSuppliers, deleteSupplier } from '../api/supplierApi'; // Use new API file
import SupplierEditModal from '../components/SupplierEditModal'; // Use new Modal
import ConfirmationContext from '../context/ConfirmationContext'; // For delete confirm

// MUI Imports
import {
  Box, Button, Typography, Paper, Stack, Container, Chip,
  // --- NEW: Added Imports ---
  IconButton,
  Tooltip
  // --- END NEW ---
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
// --- NEW: Added Imports ---
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
// --- END NEW ---
import { toast } from 'react-toastify';

// StatusChip component (no changes)
const StatusChip = ({ status }) => {
  const statusConfig = {
    'Pending': { label: 'Pending', color: 'warning' },
    'Approved': { label: 'Approved', color: 'success' },
    'Rejected': { label: 'Rejected', color: 'error' },
  };
  const config = statusConfig[status] || { label: status, color: 'default' };
  return <Chip label={config.label} color={config.color} size="small" sx={{ textTransform: 'capitalize' }} />;
};

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const { confirm } = useContext(ConfirmationContext); // Use confirmation context

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const response = await getSuppliers(); // Use new API
      setSuppliers(response);
    } catch (err) {
      console.error("Failed to fetch suppliers", err);
      toast.error(err.response?.data?.message || "Failed to fetch suppliers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = () => {
    fetchSuppliers();
    // No need to close modal here, modal can close itself on success
  };

  const openSupplierModalForAdd = () => {
    setEditingSupplier(null);
    setIsSupplierModalOpen(true);
  };
  
  const openSupplierModalForEdit = (supplier) => {
    setEditingSupplier(supplier);
    setIsSupplierModalOpen(true);
  };

  const handleDelete = async (supplier) => {
    // Use confirmation context
    try {
      await confirm(`Delete ${supplier.name}? This action cannot be undone.`);
      await deleteSupplier(supplier._id); // Use new API
      toast.success(`Supplier '${supplier.name}' deleted.`);
      fetchSuppliers();
    } catch (err) {
      if (err) { // Only show error if it's not a "cancel"
        toast.error(err.response?.data?.message || 'Failed to delete supplier.');
      }
    }
  };

  const columns = [
    { field: 'name', headerName: 'Supplier Name', flex: 1 },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => <StatusChip status={params.row.status} />
    },
    {
      field: 'defaultPaymentTerms',
      headerName: 'Default Terms',
      width: 150,
    },
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
      width: 120, // --- MODIFIED: Reduced width ---
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      // --- MODIFIED: Replaced Buttons with IconButtons ---
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Edit Info / Products">
            <IconButton size="small" onClick={() => openSupplierModalForEdit(params.row)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Supplier">
            <IconButton size="small" color="error" onClick={() => handleDelete(params.row)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      )
      // --- END MODIFICATION ---
    }
  ];

  return (
    <Container maxWidth="xl" sx={{ p: 3, mt: 2 }}>
      {/* --- Renders the new "smart" modal --- */}
      <SupplierEditModal
        open={isSupplierModalOpen} 
        onClose={() => setIsSupplierModalOpen(false)} 
        onFormSubmit={handleFormSubmit}
        supplierToEdit={editingSupplier}
      />

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

      <Paper sx={{ height: '75vh', width: ' 100%' }}>
        <DataGrid
          rows={suppliers}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row._id}
        />
      </Paper>
    </Container>
  );
};

export default SuppliersPage;