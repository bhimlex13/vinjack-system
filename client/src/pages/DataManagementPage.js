// client/src/pages/DataManagementPage.js
import React, { useState, useEffect, useContext } from 'react'; 
import api from '../api/axios';
import { getServices, createService, updateService, deleteService } from '../api/serviceApi';
import AuthContext from '../context/AuthContext'; 
import { motion } from 'framer-motion';

// MUI Imports
import {
  Box, Typography, Tabs, Tab, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, TextField, IconButton, Switch, FormControlLabel,
  Tooltip, Chip, Container, TablePagination, InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download'; 
import StorageIcon from '@mui/icons-material/Storage';
import BackupIcon from '@mui/icons-material/Backup';
import SearchIcon from '@mui/icons-material/Search';

// Initial state for the form
const emptyFormState = { name: '', description: '', charge: '', status: 'active' };

const DataManagementPage = () => {
  const { user } = useContext(AuthContext); 
  const [activeTab, setActiveTab] = useState('categories');
  
  // Data States
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [services, setServices] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formState, setFormState] = useState(emptyFormState);
  const [isDownloading, setIsDownloading] = useState(false); 

  // --- Pagination & Filter States ---
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [catRes, brandRes, serviceRes] = await Promise.all([
        api.get('/categories'),
        api.get('/brands'),
        getServices(),
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

  // Reset pagination/search when tab changes
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setPage(0);
    setSearchTerm('');
  };

  // --- Pagination Handlers ---
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Animation Variants
  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
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
    const { name, value, checked } = e.target;
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
    if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
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
        alert(`Failed to delete: ${error.response?.data?.message || 'Item might be in use.'}`);
      }
    }
  };

  const handleDownloadBackup = async () => {
    setIsDownloading(true);
    try {
      const response = await api.get('/settings/backup/create', {
        responseType: 'blob', 
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let fileName = 'vinjack-backup.json'; 
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (fileNameMatch && fileNameMatch.length === 2) {
          fileName = fileNameMatch[1];
        }
      }

      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();

      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Backup failed:", error);
      alert('Failed to download backup. Check server logs for details.');
    } finally {
      setIsDownloading(false);
    }
  };

  const renderTable = () => {
    const rawData = { categories, brands, services }[activeTab];
    const isServiceTab = activeTab === 'services';

    // --- Filtering Logic ---
    const filteredData = rawData.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // --- Pagination Logic ---
    const paginatedData = filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
      <Paper sx={{ borderRadius: 2, boxShadow: 0, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: 'grey.50' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                {isServiceTab && <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>}
                {isServiceTab && <TableCell sx={{ fontWeight: 700 }} align="right">Charge</TableCell>}
                {isServiceTab && <TableCell sx={{ fontWeight: 700 }} align="center">Status</TableCell>}
                <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedData.length > 0 ? (
                  paginatedData.map(item => (
                  <TableRow key={item._id} hover>
                      <TableCell>{item.name}</TableCell>
                      {isServiceTab && <TableCell>{item.description}</TableCell>}
                      {isServiceTab && <TableCell align="right" sx={{ fontWeight: 600 }}>{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(item.charge)}</TableCell>}
                      {isServiceTab && (
                          <TableCell align="center">
                              <Chip 
                                  label={item.status} 
                                  size="small" 
                                  color={item.status === 'active' ? 'success' : 'default'} 
                                  variant="outlined"
                                  sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                              />
                          </TableCell>
                      )}
                      <TableCell align="center">
                      <Tooltip title="Edit">
                          <IconButton onClick={() => openModal(item)} color="primary" size="small"><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                          <IconButton onClick={() => handleDelete(item._id)} color="error" size="small"><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      </TableCell>
                  </TableRow>
                  ))
              ) : (
                  <TableRow>
                      <TableCell colSpan={isServiceTab ? 5 : 2} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          No items found matching "{searchTerm}".
                      </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* --- Pagination Component --- */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    );
  };
  
  const getModalTitle = () => {
    const action = editingItem ? 'Edit' : 'Add New';
    const type = { categories: 'Category', brands: 'Brand', services: 'Service' }[activeTab];
    return `${action} ${type}`;
  };

  return (
    <Container maxWidth="xl" sx={{ pb: 4 }}>
      <motion.div initial="hidden" animate="visible" variants={pageVariants}>
        
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'info.light', color: 'info.dark', mr: 2, boxShadow: 2 }}>
            <StorageIcon fontSize="large" />
          </Box>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
              Data Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage system categories, brands, and service offerings
            </Typography>
          </Box>
        </Box>

        <Paper sx={{ mb: 3, borderRadius: 3, boxShadow: 2, overflow: 'hidden' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
            <Tabs 
                value={activeTab} 
                onChange={handleTabChange} 
                indicatorColor="primary"
                textColor="primary"
                variant="scrollable"
                scrollButtons="auto"
                sx={{ '& .MuiTab-root': { fontWeight: 600, minHeight: 60 } }}
            >
              <Tab label="Categories" value="categories" />
              <Tab label="Brands" value="brands" />
              <Tab label="Services" value="services" />
            </Tabs>
          </Box>

          <Box sx={{ p: 3 }}>
            {/* Toolbar: Search and Add Button */}
            <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
              <TextField
                placeholder="Search..."
                size="small"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: { xs: '100%', sm: 300 } }}
              />
              <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={() => openModal()}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Add New {{ categories: 'Category', brands: 'Brand', services: 'Service' }[activeTab]}
              </Button>
            </Box>

            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}><CircularProgress /></Box>
            ) : renderTable()}
          </Box>
        </Paper>

        {(user?.role === 'Super Admin' || user?.role === 'Admin') && (
          <Paper sx={{ p: 3, mt: 4, borderRadius: 3, borderLeft: '6px solid', borderLeftColor: 'secondary.main', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: 'secondary.50', color: 'secondary.main', mr: 2 }}>
                    <BackupIcon fontSize="medium" />
                </Box>
                <Box>
                    <Typography variant="h6" fontWeight={700}>System Backup</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Download a full JSON backup of your database for offline storage.
                    </Typography>
                </Box>
            </Box>
            
            <Button
              variant="contained"
              color="secondary"
              startIcon={isDownloading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
              onClick={handleDownloadBackup}
              disabled={isDownloading}
              sx={{ fontWeight: 700, width: { xs: '100%', sm: 'auto' } }}
            >
              {isDownloading ? 'Generating...' : 'Download Backup'}
            </Button>
          </Paper>
        )}

        {/* Add/Edit Modal */}
        <Dialog open={isModalOpen} onClose={closeModal} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>{getModalTitle()}</DialogTitle>
          <DialogContent>
            <TextField autoFocus required margin="dense" label="Name" type="text" fullWidth variant="outlined"
              name="name" value={formState.name} onChange={handleFormChange}
            />
            {activeTab === 'services' && (
              <>
                <TextField margin="dense" label="Description" type="text" fullWidth variant="outlined" multiline rows={2}
                  name="description" value={formState.description} onChange={handleFormChange}
                />
                <TextField margin="dense" label="Charge (₱)" type="number" fullWidth variant="outlined"
                  name="charge" value={formState.charge} onChange={handleFormChange}
                  InputProps={{ inputProps: { min: 0, step: "0.01" } }} 
                />
                <FormControlLabel
                  control={<Switch checked={formState.status === 'active'} onChange={handleFormChange} name="status" />}
                  label={formState.status === 'active' ? 'Active' : 'Inactive'}
                  sx={{ mt: 1 }}
                />
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={closeModal} color="inherit">Cancel</Button>
            <Button onClick={handleSave} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Container>
  );
};

export default DataManagementPage;