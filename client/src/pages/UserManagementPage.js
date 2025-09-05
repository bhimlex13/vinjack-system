// client/src/pages/UserManagementPage.js
import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { approveUserUpdate, rejectUserUpdate } from '../api/userApi';
import EditUserModal from '../components/EditUserModal';
import CreateUserModal from '../components/CreateUserModal'; 
import CredentialsDisplayModal from '../components/CredentialsDisplayModal';

// MUI Imports
import { Box, Button, Typography, Paper, Stack, Chip, Alert } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCredentials, setNewCredentials] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
      setError('Failed to fetch users.');
    } finally {
      setIsLoading(false);
    }
  };

  const profileUpdateRequests = useMemo(() => users.filter(u => u.hasPendingChanges), [users]);
  const managedUsers = useMemo(() => users.filter(u => u.role !== 'Owner'), [users]);

  const handleUserCreated = (credentials) => {
    setIsCreateModalOpen(false);
    setNewCredentials(credentials);
    fetchUsers();
  };
  
  const handleApiResponse = async (apiCall) => {
    try {
      const response = await apiCall();
      setMessage(response.message || 'Action completed successfully!');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred.');
    } finally {
      setTimeout(() => {
        setMessage('');
        setError('');
      }, 5000);
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const requestColumns = [
    {
      field: 'currentInfo',
      headerName: 'Current Info',
      flex: 1,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{params.row.fullName}</Typography>
          <Typography variant="caption" display="block">{params.row.username}</Typography>
          <Typography variant="caption">{params.row.email}</Typography>
        </Box>
      )
    },
    {
      field: 'requestedChanges',
      headerName: 'Requested Changes',
      flex: 1,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{params.row.pendingChanges?.fullName || params.row.fullName}</Typography>
          <Typography variant="caption" display="block">{params.row.pendingChanges?.username || params.row.username}</Typography>
          <Typography variant="caption">{params.row.pendingChanges?.email || params.row.email}</Typography>
        </Box>
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="contained" color="success" onClick={() => handleApiResponse(() => approveUserUpdate(params.row._id))}>Approve</Button>
          <Button size="small" variant="contained" color="error" onClick={() => handleApiResponse(() => rejectUserUpdate(params.row._id))}>Reject</Button>
        </Stack>
      )
    }
  ];

  const employeeColumns = [
    { field: 'fullName', headerName: 'Full Name', flex: 1 },
    { field: 'username', headerName: 'Username', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 },
    { field: 'role', headerName: 'Role', width: 150 },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => (
        <Chip 
          label={params.value}
          color={params.value === 'active' ? 'success' : 'error'}
          size="small"
          sx={{ textTransform: 'capitalize' }}
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Button 
          variant="outlined" 
          size="small" 
          onClick={() => openEditModal(params.row)}
          disabled={params.row.role === 'Owner'}
        >
          Edit
        </Button>
      )
    }
  ];

  return (
    <Box>
      {/* --- MODALS --- */}
      {isEditModalOpen && (
        <EditUserModal 
          open={isEditModalOpen} 
          user={editingUser} 
          onClose={() => setIsEditModalOpen(false)} 
          onUserUpdate={fetchUsers} 
        />
      )}
      {isCreateModalOpen && (
        <CreateUserModal 
          open={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
          onUserCreated={handleUserCreated} 
        />
      )}
      {newCredentials && <CredentialsDisplayModal credentials={newCredentials} onClose={() => setNewCredentials(null)} />}

      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 2 }}>
        User Management
      </Typography>

      <Stack spacing={1} sx={{ mb: 2 }}>
        {message && <Alert severity="success">{message}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>

      <Paper sx={{ mb: 4, p: 2 }}>
        <Typography variant="h5" gutterBottom>Profile Update Requests</Typography>
        <Box sx={{ height: 'auto', width: '100%' }}>
          <DataGrid
            rows={profileUpdateRequests}
            columns={requestColumns}
            loading={isLoading}
            getRowId={(row) => row._id}
            autoHeight
            rowHeight={80}
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">Manage Employees</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsCreateModalOpen(true)}>
              Add New Employee
            </Button>
        </Box>
        <Box sx={{ height: 'auto', width: '100%' }}>
            <DataGrid
              rows={managedUsers}
              columns={employeeColumns}
              loading={isLoading}
              getRowId={(row) => row._id}
              autoHeight
            />
        </Box>
      </Paper>
    </Box>
  );
};

export default UserManagementPage;