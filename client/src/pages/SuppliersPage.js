// client/src/pages/SuppliersPage.js
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { getSuppliers, deleteSupplier } from '../api/supplierApi'; 
import SupplierEditModal from '../components/SupplierEditModal'; 
import ConfirmationContext from '../context/ConfirmationContext'; 
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion'; 

// MUI Imports
import {
  Box, Button, Typography, Paper, Stack, Container, Chip,
  IconButton, Tooltip, TextField, InputAdornment, Grid,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SearchIcon from '@mui/icons-material/Search';

import LoadingSpinner from '../components/LoadingSpinner';

const StatusChip = ({ status }) => {
  const statusConfig = {
    'Pending': { label: 'Pending', color: 'warning' },
    'Approved': { label: 'Approved', color: 'success' },
    'Rejected': { label: 'Rejected', color: 'error' },
  };
  const config = statusConfig[status] || { label: status, color: 'default' };
  return <Chip label={config.label} color={config.color} size="small" variant="filled" sx={{ fontWeight: 600 }} />;
};

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  
  // --- Filter States ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { confirm } = useContext(ConfirmationContext); 

  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };

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

  // --- Filtering Logic ---
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      const lowerSearch = searchTerm.toLowerCase();
      const matchesSearch = 
        (supplier.name?.toLowerCase().includes(lowerSearch)) ||
        (supplier.contactPerson?.toLowerCase().includes(lowerSearch)) ||
        (supplier.email?.toLowerCase().includes(lowerSearch));

      const matchesStatus = filterStatus ? supplier.status === filterStatus : true;

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchTerm, filterStatus]);

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
      const isConfirmed = await confirm(`Delete ${supplier.name}?`, `Are you sure you want to delete this supplier? This action cannot be undone.`);
      if(isConfirmed) {
        await deleteSupplier(supplier._id); 
        toast.success(`Supplier '${supplier.name}' deleted.`);
        fetchSuppliers();
      }
    } catch (err) {
      if (err) { 
        toast.error(err.response?.data?.message || 'Failed to delete supplier.');
      }
    }
  };

  const columns = [
    { 
      field: 'name', 
      headerName: 'Supplier Name', 
      flex: 1,
      renderCell: (params) => <Typography fontWeight={600} variant="body2">{params.value}</Typography>
    },
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
        <Stack direction="row" spacing={1} justifyContent="center">
          <Tooltip title="Edit Info / Products">
            <IconButton 
              size="small" 
              onClick={() => openSupplierModalForEdit(params.row)}
              sx={{ color: 'primary.main', bgcolor: 'primary.50', '&:hover': { bgcolor: 'primary.100' } }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Supplier">
            <IconButton 
              size="small" 
              color="error" 
              onClick={() => handleDelete(params.row)}
              sx={{ bgcolor: 'error.50', '&:hover': { bgcolor: 'error.100' } }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )
    }
  ];

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
        
        {/* Header Section */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'secondary.light', color: 'secondary.dark', display: 'flex' }}>
                <LocalShippingIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={700}>Supplier Management</Typography>
                <Typography variant="body2" color="text.secondary">Manage supplier relationships and product catalogs</Typography>
              </Box>
          </Stack>
          
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={openSupplierModalForAdd}
            sx={{ fontWeight: 600, px: 3, borderRadius: 2 }}
          >
            Add Supplier
          </Button>
        </Box>

        {/* Filters Section */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                placeholder="Search Name, Contact Person, or Email..."
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Filter by Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value=""><em>All Statuses</em></MenuItem>
                  <MenuItem value="Approved">Approved</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Data Grid Paper */}
        <Paper 
          sx={{ 
            height: '65vh', 
            width: '100%', 
            borderRadius: 3, 
            boxShadow: 3,
            overflow: 'hidden',
            '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'grey.50',
                fontWeight: 700,
                fontSize: '0.9rem'
            },
            '& .MuiDataGrid-row:hover': {
                backgroundColor: 'action.hover'
            }
          }}
        >
          <DataGrid
            rows={filteredSuppliers}
            columns={columns}
            loading={isLoading}
            getRowId={(row) => row._id}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            sx={{ border: 'none' }}
          />
        </Paper>
      </motion.div>
    </Container>
  );
};

export default SuppliersPage;