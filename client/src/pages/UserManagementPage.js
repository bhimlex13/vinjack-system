// client/src/pages/UserManagementPage.js
import React, { useState, useEffect, useMemo, useContext, useCallback } from 'react';
import api from '../api/axios';
import EditUserModal from '../components/EditUserModal';
import CreateUserModal from '../components/CreateUserModal'; 
import CredentialsDisplayModal from '../components/CredentialsDisplayModal';
import AdminConfirmPasswordModal from '../components/AdminConfirmPasswordModal';
import { toast } from 'react-toastify';
import AuthContext from '../context/AuthContext'; 
import ConfirmationContext from '../context/ConfirmationContext'; 
import { motion } from 'framer-motion';

// MUI Imports
import { 
  Box, Button, Typography, Paper, Chip, Grid,
  Tabs, Tab, 
  Checkbox, FormControlLabel, FormGroup, Divider, Alert, Skeleton, 
  CircularProgress, Container, IconButton, Tooltip, Stack 
} from '@mui/material'; 
import { DataGrid } from '@mui/x-data-grid';
import { Add as AddIcon } from '@mui/icons-material';
import SaveIcon from '@mui/icons-material/Save'; 
import RestartAltIcon from '@mui/icons-material/RestartAlt'; 
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import EditIcon from '@mui/icons-material/Edit';
import SecurityIcon from '@mui/icons-material/Security';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

import LoadingSpinner from '../components/LoadingSpinner';

// Helper function
const groupPermissions = (permissions) => {
  if (!permissions) return {};
  return permissions.reduce((acc, perm) => {
    (acc[perm.category] = acc[perm.category] || []).push(perm);
    return acc;
  }, {});
};

// Custom TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-mgmt-tabpanel-${index}`}
      aria-labelledby={`user-mgmt-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const UserManagementPage = () => {
  const [mainTab, setMainTab] = useState(0); // 0 = Users, 1 = Permissions

  // State for User Management
  const [users, setUsers] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCredentials, setNewCredentials] = useState(null);

  // State for Permission Management
  const [allPermissions, setAllPermissions] = useState([]);
  const [adminPermissions, setAdminPermissions] = useState(new Set());
  const [salespersonPermissions, setSalespersonPermissions] = useState(new Set());
  const [isPermsLoading, setIsPermsLoading] = useState(true);
  const [isPermsSaving, setIsPermsSaving] = useState(false);
  const [currentPermRoleTab, setCurrentPermRoleTab] = useState('Admin');

  // State for Permission Security Modal
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [permAction, setPermAction] = useState(null); // 'SAVE' or 'RESET'

  // Hooks
  const { user: currentUser } = useContext(AuthContext);
  const { confirm } = useContext(ConfirmationContext);

  // Animation Variants
  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  // --- FUNCTIONS FOR USER MANAGEMENT ---
  const fetchUsers = useCallback(async () => {
    setIsUsersLoading(true);
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
      toast.error('Failed to fetch users.');
    } finally {
      setIsUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const managedUsers = useMemo(() => {
    if (!currentUser) return [];
    return users.filter(u => u._id !== currentUser._id);
  }, [users, currentUser]);

  const handleUserCreated = (credentials) => {
    setIsCreateModalOpen(false);
    setNewCredentials(credentials);
    fetchUsers();
  };
  
  const openEditModal = (user) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const employeeColumns = [
    { field: 'fullName', headerName: 'Full Name', flex: 1, minWidth: 150 },
    { field: 'username', headerName: 'Username', flex: 1, minWidth: 120 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
    
    // --- UPDATED ROLE COLUMN ---
    { 
      field: 'role', 
      headerName: 'Role', 
      width: 160,
      align: 'center',       // Horizontal Alignment for cell
      headerAlign: 'center', // Horizontal Alignment for header
      renderCell: (params) => (
        <Stack 
            direction="row" 
            alignItems="center" 
            justifyContent="center" // Force content to center
            spacing={1} 
            sx={{ width: '100%', height: '100%' }}
        >
           {params.value === 'Super Admin' && <SecurityIcon fontSize="small" color="error" />}
           {params.value === 'Admin' && <VerifiedUserIcon fontSize="small" color="primary" />}
           <Typography variant="body2" fontWeight={500}>{params.value}</Typography>
        </Stack>
      )
    },
    // ---------------------------

    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      align: 'center',       
      headerAlign: 'center', 
      renderCell: (params) => (
        <Chip 
          label={params.value}
          color={params.value === 'active' ? 'success' : 'error'}
          size="small"
          variant="outlined"
          sx={{ textTransform: 'capitalize', fontWeight: 600 }}
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Tooltip title="Edit User">
          <span>
            <IconButton 
              color="primary" 
              size="small"
              onClick={() => openEditModal(params.row)}
              disabled={params.row.role === 'Super Admin'}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )
    }
  ];

  // --- FUNCTIONS FOR PERMISSION MANAGEMENT ---
  const fetchPermsData = useCallback(async () => {
    setIsPermsLoading(true);
    try {
      const [allPermsRes, adminPermsRes, salesPermsRes] = await Promise.all([
        api.get('/permissions/all'),
        api.get('/permissions/Admin'),
        api.get('/permissions/Salesperson'),
      ]);
      setAllPermissions(allPermsRes.data);
      setAdminPermissions(new Set(adminPermsRes.data.allowedPermissions));
      setSalespersonPermissions(new Set(salesPermsRes.data.allowedPermissions));
    } catch (error) {
      console.error("Failed to fetch permissions", error);
      toast.error(error.response?.data?.message || 'Failed to load permissions.');
    } finally {
      setIsPermsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mainTab === 1) {
      fetchPermsData();
    }
  }, [mainTab, fetchPermsData]);

  const handleMainTabChange = (event, newValue) => {
    setMainTab(newValue);
  };

  const handlePermRoleTabChange = (event, newValue) => {
    setCurrentPermRoleTab(newValue);
  };

  const handlePermissionChange = (event) => {
    const { name, checked } = event.target;
    const setter = currentPermRoleTab === 'Admin' ? setAdminPermissions : setSalespersonPermissions;
    setter(prev => {
      const newSet = new Set(prev);
      if (checked) newSet.add(name);
      else newSet.delete(name);
      return newSet;
    });
  };

  const initiateSavePerms = () => {
    setPermAction('SAVE');
    setIsPermModalOpen(true);
  };

  const initiateResetPerms = async () => {
    const isConfirmed = await confirm({
        title: 'Confirm Reset',
        description: 'Are you sure? This will reset Admin and Salesperson roles to default settings.'
    });
    
    if (isConfirmed) {
        setPermAction('RESET');
        setIsPermModalOpen(true);
    }
  };

  const handleConfirmPermAction = async (adminPassword) => {
    setIsPermsSaving(true);
    try {
      if (permAction === 'SAVE') {
        const permsToSave = currentPermRoleTab === 'Admin' ? Array.from(adminPermissions) : Array.from(salespersonPermissions);
        await api.put(`/permissions/${currentPermRoleTab}`, {
          allowedPermissions: permsToSave,
          adminPassword 
        });
        toast.success(`'${currentPermRoleTab}' permissions updated successfully.`);
      } else if (permAction === 'RESET') {
        await api.post('/permissions/seed', {
            adminPassword 
        });
        toast.success('Permissions reset to default.');
        await fetchPermsData();
      }
    } catch (error) {
      console.error(`Failed to execute ${permAction}`, error);
      toast.error(error.response?.data?.message || 'Action failed.');
    } finally {
      setIsPermsSaving(false);
      setPermAction(null);
    }
  };

  const groupedPerms = useMemo(() => groupPermissions(allPermissions), [allPermissions]);
  const activePermissionSet = currentPermRoleTab === 'Admin' ? adminPermissions : salespersonPermissions;

  return (
    <Container maxWidth="xl" sx={{ pb: 4 }}>
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

      <AdminConfirmPasswordModal
        open={isPermModalOpen}
        onClose={() => setIsPermModalOpen(false)}
        onConfirm={handleConfirmPermAction}
      />

      <motion.div initial="hidden" animate="visible" variants={pageVariants}>
        {/* --- PAGE HEADER --- */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.dark', mr: 2, boxShadow: 2 }}>
            <ManageAccountsIcon fontSize="large" />
          </Box>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
              User Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage employees, roles, and security permissions
            </Typography>
          </Box>
        </Box>

        {/* --- MAIN TABS --- */}
        <Paper sx={{ borderRadius: 3, boxShadow: 2, overflow: 'hidden' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50', px: 2 }}>
                <Tabs value={mainTab} onChange={handleMainTabChange} aria-label="User management tabs">
                <Tab label="Manage Employees" id="user-mgmt-tab-0" sx={{ fontWeight: 600 }} />
                <Tab label="Role Permissions" id="user-mgmt-tab-1" sx={{ fontWeight: 600 }} />
                </Tabs>
            </Box>

            {/* --- TAB PANEL 1: MANAGE EMPLOYEES --- */}
            <TabPanel value={mainTab} index={0}>
                <Box sx={{ p: 3, pt: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6" fontWeight={700}>Employee Directory</Typography>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsCreateModalOpen(true)}>
                            Add New Employee
                        </Button>
                    </Box>
                    
                    <Box sx={{ height: 500, width: '100%' }}>
                        {isUsersLoading ? (
                           <LoadingSpinner text="Loading Users..." />
                        ) : (
                            <DataGrid
                                rows={managedUsers}
                                columns={employeeColumns}
                                getRowId={(row) => row._id}
                                disableRowSelectionOnClick
                                sx={{
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 2,
                                    '& .MuiDataGrid-columnHeaders': {
                                        backgroundColor: 'grey.50',
                                        fontWeight: 700,
                                    },
                                    '& .MuiDataGrid-row:hover': {
                                        backgroundColor: 'action.hover'
                                    }
                                }}
                            />
                        )}
                    </Box>
                </Box>
            </TabPanel>

            {/* --- TAB PANEL 2: ROLE PERMISSIONS --- */}
            <TabPanel value={mainTab} index={1}>
                <Box sx={{ p: 3, pt: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                        <Tabs value={currentPermRoleTab} onChange={handlePermRoleTabChange} sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 0.5 }}>
                        <Tab label="Admin Role" value="Admin" sx={{ minHeight: 40, borderRadius: 1.5 }} />
                        <Tab label="Salesperson Role" value="Salesperson" sx={{ minHeight: 40, borderRadius: 1.5 }} />
                        </Tabs>
                        <Button
                            variant="outlined"
                            color="warning"
                            size="small"
                            startIcon={<RestartAltIcon />}
                            onClick={initiateResetPerms} 
                            disabled={isPermsLoading || isPermsSaving}
                        >
                            Reset Defaults
                        </Button>
                    </Box>
                    
                    {isPermsLoading ? (
                        <Grid container spacing={3}>
                            {[...Array(6)].map((_, i) => (
                                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={i}>
                                <Skeleton variant="rectangular" width="100%" height={150} sx={{ borderRadius: 2 }} />
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Grid container spacing={3}>
                            {Object.keys(groupedPerms).map((category) => (
                                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={category}>
                                <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2 }}>
                                    <Typography variant="subtitle1" fontWeight={700} color="primary.main" gutterBottom sx={{ borderBottom: '1px dashed #e0e0e0', pb: 1, mb: 1 }}>
                                        {category}
                                    </Typography>
                                    <FormGroup>
                                        {groupedPerms[category].map((perm) => (
                                            <FormControlLabel
                                            key={perm.key}
                                            control={
                                                <Checkbox
                                                checked={activePermissionSet.has(perm.key)}
                                                onChange={handlePermissionChange}
                                                name={perm.key}
                                                size="small"
                                                />
                                            }
                                            label={<Typography variant="body2">{perm.description}</Typography>}
                                            sx={{ mb: 0.5 }}
                                            />
                                        ))}
                                    </FormGroup>
                                </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    <Divider sx={{ my: 3 }} />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <Alert severity="info" sx={{ py: 0, alignItems: 'center' }}>
                           'Super Admin' has all permissions by default.
                        </Alert>
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            startIcon={isPermsSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                            disabled={isPermsLoading || isPermsSaving}
                            onClick={initiateSavePerms} 
                            sx={{ minWidth: 200 }}
                        >
                            Save Changes
                        </Button>
                    </Box>
                </Box>
            </TabPanel>
        </Paper>
      </motion.div>
    </Container>
  );
};

export default UserManagementPage;