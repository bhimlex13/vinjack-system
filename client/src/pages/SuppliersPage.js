// client/src/pages/SuppliersPage.js
import React, { useState, useEffect, useContext } from 'react';
import { getSuppliers, deleteSupplier } from '../api/supplierApi'; 
import SupplierEditModal from '../components/SupplierEditModal'; 
import ConfirmationContext from '../context/ConfirmationContext'; 
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion'; // --- NEW IMPORT ---

// MUI Imports
import {
  Box, Button, Typography, Paper, Stack, Container, Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// --- NEW IMPORT ---
import LoadingSpinner from '../components/LoadingSpinner';

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
  const { confirm } = useContext(ConfirmationContext); 

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

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const response = await getSuppliers(); 
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
    try {
      await confirm(`Delete ${supplier.name}? This action cannot be undone.`);
      await deleteSupplier(supplier._id); 
      toast.success(`Supplier '${supplier.name}' deleted.`);
      fetchSuppliers();
    } catch (err) {
      if (err) { 
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
      width: 120, 
      sortable: false,
      align: 'center',
      headerAlign: 'center',
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
    }
  ];

  // --- RENDER LOADING SPINNER ---
  if (isLoading && suppliers.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <LoadingSpinner text="Loading Suppliers..." />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ p: 3, mt: 2 }}>
      
      <AnimatePresence>
        {isSupplierModalOpen && (
          <SupplierEditModal
            open={isSupplierModalOpen} 
            onClose={() => setIsSupplierModalOpen(false)} 
            onFormSubmit={handleFormSubmit}
            supplierToEdit={editingSupplier}
          />
        )}
      </AnimatePresence>

      <motion.div initial="hidden" animate="visible" variants={pageVariants}>
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
      </motion.div>
    </Container>
  );
};

export default SuppliersPage;