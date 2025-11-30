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

// MUI Imports
import { 
  Box, Button, Typography, Paper, Chip, Grid,
  Tabs, Tab, 
  Checkbox, FormControlLabel, FormGroup, Divider, Alert, Skeleton, 
  CircularProgress 
} from '@mui/material'; 
import { DataGrid } from '@mui/x-data-grid';
import { Add as AddIcon } from '@mui/icons-material';
import SaveIcon from '@mui/icons-material/Save'; 
import RestartAltIcon from '@mui/icons-material/RestartAlt'; 

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

  // --- NEW: Security Handlers for Permissions ---

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
  
  // Note: currentPerms is not explicitly used in render because we check the Set directly in checkboxes,
  // but keeping logic consistent.
  // const currentPerms = currentTab === 'Admin' ? adminPermissions : salespersonPermissions; 

  // Derived state for the checkboxes to use the correct set based on the Tab
  const activePermissionSet = currentPermRoleTab === 'Admin' ? adminPermissions : salespersonPermissions;

  return (
    <Box sx={{ p: 3, width: '100%' }}>
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

      {/* --- Permission Security Modal --- */}
      <AdminConfirmPasswordModal
        open={isPermModalOpen}
        onClose={() => setIsPermModalOpen(false)}
        onConfirm={handleConfirmPermAction}
      />

      {/* --- PAGE HEADER --- */}
      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 2 }}>
        User & Security Management
      </Typography>

      {/* --- MAIN TABS --- */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={mainTab} onChange={handleMainTabChange} aria-label="User management tabs">
          <Tab label="Manage Employees" id="user-mgmt-tab-0" />
          <Tab label="Role Permissions" id="user-mgmt-tab-1" />
        </Tabs>
      </Box>

      {/* --- TAB PANEL 1: MANAGE EMPLOYEES --- */}
      <TabPanel value={mainTab} index={0}>
        <Grid container spacing={4}>
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
                    loading={isUsersLoading}
                    getRowId={(row) => row._id}
                    autoHeight
                  />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* --- TAB PANEL 2: ROLE PERMISSIONS --- */}
      <TabPanel value={mainTab} index={1}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
            <Tabs value={currentPermRoleTab} onChange={handlePermRoleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="Admin Role" value="Admin" />
              <Tab label="Salesperson Role" value="Salesperson" />
            </Tabs>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<RestartAltIcon />}
              onClick={initiateResetPerms} 
              disabled={isPermsLoading || isPermsSaving}
              sx={{ mt: { xs: 2, md: 0 } }}
            >
              Reset All to Default
            </Button>
          </Box>
          <Divider sx={{ mb: 3 }} />
          {isPermsLoading ? (
            <Grid container spacing={3}>
              {[...Array(4)].map((_, i) => (
                <Grid item size={{ xs: 12, md: 6, lg: 4 }} key={i}>
                  <Skeleton variant="text" width="40%" height={40} />
                  <Skeleton variant="rectangular" width="100%" height={120} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Grid container spacing={3}>
              {Object.keys(groupedPerms).map((category) => (
                <Grid item size={{ xs: 12, md: 6, lg: 4 }} key={category}>
                  <Typography variant="h6" gutterBottom>{category}</Typography>
                  <FormGroup>
                    {groupedPerms[category].map((perm) => (
                      <FormControlLabel
                        key={perm.key}
                        control={
                          <Checkbox
                            checked={activePermissionSet.has(perm.key)}
                            onChange={handlePermissionChange}
                            name={perm.key}
                          />
                        }
                        label={perm.description}
                      />
                    ))}
                  </FormGroup>
                </Grid>
              ))}
            </Grid>
          )}
          <Divider sx={{ my: 3 }} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={isPermsSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              disabled={isPermsLoading || isPermsSaving}
              onClick={initiateSavePerms} 
            >
              Save {currentPermRoleTab} Permissions
            </Button>
          </Box>
          <Alert severity="info" sx={{ mt: 3 }}>
            <strong>Note:</strong> 'Super Admin' role always has all permissions by default and cannot be changed.
          </Alert>
        </Paper>
      </TabPanel>
    </Box>
  );
};

export default UserManagementPage;