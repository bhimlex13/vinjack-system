// client/src/pages/DataManagementPage.js
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { getServices, createService, updateService, deleteService } from '../api/serviceApi'; // Import new service API

// MUI Imports
import {
  Box, Typography, Tabs, Tab, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, TextField, IconButton, Switch, FormControlLabel,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// Initial state for the form
const emptyFormState = { name: '', description: '', charge: '', status: 'active' };

const DataManagementPage = () => {
  const [activeTab, setActiveTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [services, setServices] = useState([]); // State for services
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // Will hold the item being edited
  const [formState, setFormState] = useState(emptyFormState); // State for form fields

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [catRes, brandRes, serviceRes] = await Promise.all([
        api.get('/categories'),
        api.get('/brands'),
        getServices(), // Fetch all services
      ]);
      setCategories(catRes.data);
      setBrands(brandRes.data);
      setServices(serviceRes);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormState({
        name: item.name || '',
        description: item.description || '',
        charge: item.charge || '',
        status: item.status || 'active',
      });
    } else {
      setEditingItem(null);
      setFormState(emptyFormState);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormState(emptyFormState);
  };

  const handleFormChange = (e) => {
    const { name, value, checked, type } = e.target;
    if (activeTab === 'services' && name === 'status') {
      setFormState(prev => ({ ...prev, status: checked ? 'active' : 'inactive' }));
    } else {
      setFormState(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    if (!formState.name.trim()) {
      alert('Name cannot be empty.');
      return;
    }
    
    try {
      switch (activeTab) {
        case 'categories':
          if (editingItem) await api.put(`/categories/${editingItem._id}`, { name: formState.name });
          else await api.post('/categories', { name: formState.name });
          break;
        case 'brands':
          if (editingItem) await api.put(`/brands/${editingItem._id}`, { name: formState.name });
          else await api.post('/brands', { name: formState.name });
          break;
        case 'services':
          if (editingItem) await updateService(editingItem._id, formState);
          else await createService(formState);
          break;
        default:
          return;
      }
      fetchData();
      closeModal();
    } catch (error) {
      alert(`Failed to save: ${error.response?.data?.message || 'Server error'}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        switch (activeTab) {
          case 'categories':
            await api.delete(`/categories/${id}`);
            break;
          case 'brands':
            await api.delete(`/brands/${id}`);
            break;
          case 'services':
            await deleteService(id);
            break;
          default:
            return;
        }
        fetchData();
      } catch (error) {
        alert(`Failed to delete: ${error.response?.data?.message || 'Server error'}`);
      }
    }
  };

  const renderTable = () => {
    const data = { categories, brands, services }[activeTab];
    const isServiceTab = activeTab === 'services';

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
              {isServiceTab && <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>}
              {isServiceTab && <TableCell sx={{ fontWeight: 'bold' }} align="right">Charge</TableCell>}
              {isServiceTab && <TableCell sx={{ fontWeight: 'bold' }} align="center">Status</TableCell>}
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map(item => (
              <TableRow key={item._id} hover>
                <TableCell>{item.name}</TableCell>
                {isServiceTab && <TableCell>{item.description}</TableCell>}
                {isServiceTab && <TableCell align="right">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(item.charge)}</TableCell>}
                {isServiceTab && <TableCell align="center" sx={{ color: item.status === 'active' ? 'green' : 'red', fontWeight: 'bold' }}>{item.status}</TableCell>}
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton onClick={() => openModal(item)} color="primary"><EditIcon /></IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => handleDelete(item._id)} color="error"><DeleteIcon /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };
  
  const getModalTitle = () => {
    const action = editingItem ? 'Edit' : 'Add New';
    const type = { categories: 'Category', brands: 'Brand', services: 'Service' }[activeTab];
    return `${action} ${type}`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
        Data Management
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Categories" value="categories" />
          <Tab label="Brands" value="brands" />
          <Tab label="Services" value="services" />
        </Tabs>
      </Box>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openModal()}>
          Add New {{ categories: 'Category', brands: 'Brand', services: 'Service' }[activeTab]}
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
      ) : renderTable()}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onClose={closeModal} fullWidth maxWidth="sm">
        <DialogTitle>{getModalTitle()}</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="Name" type="text" fullWidth variant="outlined"
            name="name" value={formState.name} onChange={handleFormChange}
          />
          {activeTab === 'services' && (
            <>
              <TextField margin="dense" label="Description" type="text" fullWidth variant="outlined" multiline rows={2}
                name="description" value={formState.description} onChange={handleFormChange}
              />
              <TextField margin="dense" label="Charge (₱)" type="number" fullWidth variant="outlined"
                name="charge" value={formState.charge} onChange={handleFormChange}
              />
              <FormControlLabel
                control={<Switch checked={formState.status === 'active'} onChange={handleFormChange} name="status" />}
                label={formState.status === 'active' ? 'Active' : 'Inactive'}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeModal}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataManagementPage;