// client/src/pages/UserManagementPage.js
import React, { useState, useEffect, useMemo, useContext } from 'react';
import api from '../api/axios';
import { approveUserUpdate, rejectUserUpdate } from '../api/userApi';
import EditUserModal from '../components/EditUserModal';
import CreateUserModal from '../components/CreateUserModal'; 
import CredentialsDisplayModal from '../components/CredentialsDisplayModal';
import { toast } from 'react-toastify';
import AuthContext from '../context/AuthContext'; 

// MUI Imports
// --- 1. FIXED: Removed 'Alert' from this line ---
import { Box, Button, Typography, Paper, Stack, Chip, Grid } from '@mui/material'; 
import { DataGrid } from '@mui/x-data-grid';
// --- 2. FIXED: Changed import path for the icon ---
import { Add as AddIcon } from '@mui/icons-material';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCredentials, setNewCredentials] = useState(null);

  const { user: currentUser } = useContext(AuthContext);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
      toast.error('Failed to fetch users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchUsers();
  }, []);

  const profileUpdateRequests = useMemo(() => users.filter(u => u.hasPendingChanges), [users]);
  
  const managedUsers = useMemo(() => {
    if (!currentUser) return [];
    return users.filter(u => u._id !== currentUser._id);
  }, [users, currentUser]);

  const handleUserCreated = (credentials) => {
    setIsCreateModalOpen(false);
    setNewCredentials(credentials);
    fetchUsers();
  };
  
  const handleApiResponse = async (apiCall) => {
    try {
      const response = await apiCall();
      toast.success(response.message || 'Action completed successfully!');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'An error occurred.');
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
          disabled={params.row.role === 'Super Admin'}
        >
          Edit
        </Button>
      )
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* --- MODALS --- */}
      {isEditModalOpen && (
        <EditUserModal 
          open={isEditModalOpen} 
          user={editingUser} 
          onClose={() => setIsEditModalOpen(false)} 
          onUserUpdate={fetchUsers}
          onPasswordResetSuccess={(credentials) => {
            setNewCredentials({
              username: credentials.username,
              password: credentials.temporaryPassword,
            });
            setIsEditModalOpen(false);
          }}
        />
      )}
      {isCreateModalOpen && (
        <CreateUserModal 
          onClose={() => setIsCreateModalOpen(false)} 
          onUserCreated={handleUserCreated} 
        />
      )}
      {newCredentials && <CredentialsDisplayModal credentials={newCredentials} onClose={() => setNewCredentials(null)} />}

      {/* --- Page layout updated to use Grid --- */}
      <Grid container spacing={4}>
        <Grid item size={{ xs: 12 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            User Management
          </Typography>
        </Grid>
        
        <Grid item size={{ xs: 12 }}>
          <Paper sx={{ p: 2 }}>
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
        </Grid>

        <Grid item size={{ xs: 12 }}>
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
        </Grid>
      </Grid>
    </Box>
  );
};

export default UserManagementPage;