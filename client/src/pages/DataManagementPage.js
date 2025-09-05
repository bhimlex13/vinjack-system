// client/src/pages/DataManagementPage.js
import React, { useState, useEffect } from 'react';
import api from '../api/axios';

// MUI Imports
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const DataManagementPage = () => {
  const [activeTab, setActiveTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItemName, setNewItemName] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [catRes, brandRes] = await Promise.all([
        api.get('/categories'),
        api.get('/brands'),
      ]);
      setCategories(catRes.data);
      setBrands(brandRes.data);
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
    setEditingItem(item);
    setNewItemName(item ? item.name : '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setNewItemName('');
  };

  const handleSave = async () => {
    if (!newItemName.trim()) {
        alert('Name cannot be empty.');
        return;
    }
    const endpoint = activeTab === 'categories' ? '/categories' : '/brands';
    const payload = { name: newItemName };
    
    try {
      if (editingItem) {
        await api.put(`${endpoint}/${editingItem._id}`, payload);
      } else {
        await api.post(endpoint, payload);
      }
      fetchData();
      closeModal();
    } catch (error) {
      alert(`Failed to save: ${error.response?.data?.message || 'Server error'}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item? This may affect existing products.')) {
        const endpoint = activeTab === 'categories' ? '/categories' : '/brands';
        try {
            await api.delete(`${endpoint}/${id}`);
            fetchData();
        } catch (error) {
            alert(`Failed to delete: ${error.response?.data?.message || 'Server error'}`);
        }
    }
  };

  const renderTable = () => {
    const data = activeTab === 'categories' ? categories : brands;
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map(item => (
              <TableRow key={item._id}>
                <TableCell>{item.name}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => openModal(item)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(item._id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
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
        </Tabs>
      </Box>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Manage {activeTab === 'categories' ? 'Categories' : 'Brands'}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openModal()}>
          Add New {activeTab === 'categories' ? 'Category' : 'Brand'}
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
        </Box>
      ) : renderTable()}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onClose={closeModal} fullWidth maxWidth="xs">
        <DialogTitle>{editingItem ? 'Edit' : 'Add New'} {activeTab === 'categories' ? 'Category' : 'Brand'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSave()}
          />
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