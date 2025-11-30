// client/src/pages/PermissionManagementPage.js
import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import {
  Box, Typography, Paper, Grid, Checkbox, FormControlLabel,
  FormGroup, Button, CircularProgress, Divider, Alert,
  Tabs, Tab, Skeleton
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

import AdminConfirmPasswordModal from '../components/AdminConfirmPasswordModal';

const groupPermissions = (permissions) => {
  if (!permissions) return {};
  return permissions.reduce((acc, perm) => {
    (acc[perm.category] = acc[perm.category] || []).push(perm);
    return acc;
  }, {});
};

const PermissionManagementPage = () => {
  const [allPermissions, setAllPermissions] = useState([]);
  const [adminPermissions, setAdminPermissions] = useState(new Set());
  const [salespersonPermissions, setSalespersonPermissions] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentTab, setCurrentTab] = useState('Admin');
  
  // State for security modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'SAVE' or 'RESET'

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const allPermsRes = await api.get('/permissions/all');
      setAllPermissions(allPermsRes.data);

      let adminPerms = [];
      try {
        const adminPermsRes = await api.get('/permissions/Admin');
        adminPerms = adminPermsRes.data.allowedPermissions || [];
      } catch (error) {
        if (error.response && error.response.status !== 404) {
          console.warn("Failed to fetch Admin permissions:", error);
        }
      }
      
      let salesPerms = [];
      try {
        const salesPermsRes = await api.get('/permissions/Salesperson');
        salesPerms = salesPermsRes.data.allowedPermissions || [];
      } catch (error) {
        if (error.response && error.response.status !== 404) {
          console.warn("Failed to fetch Salesperson permissions:", error);
        }
      }

      setAdminPermissions(new Set(adminPerms));
      setSalespersonPermissions(new Set(salesPerms));

    } catch (error) {
      if (error.response && error.response.status === 404) {
          toast.warn('Permissions list is empty. Please reset to default to seed the database.');
      } else {
          toast.error(error.response?.data?.message || 'Failed to load permissions list.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handlePermissionChange = (event) => {
    const { name, checked } = event.target;
    
    if (currentTab === 'Admin') {
      setAdminPermissions(prev => {
        const newSet = new Set(prev);
        if (checked) newSet.add(name);
        else newSet.delete(name);
        return newSet;
      });
    } else {
      setSalespersonPermissions(prev => {
        const newSet = new Set(prev);
        if (checked) newSet.add(name);
        else newSet.delete(name);
        return newSet;
      });
    }
  };

  // --- ACTION HANDLERS ---

  // 1. Initiate Save
  const handleInitiateSave = () => {
    setPendingAction('SAVE');
    setIsConfirmOpen(true);
  };

  // 2. Initiate Reset
  const handleInitiateReset = () => {
    setPendingAction('RESET');
    setIsConfirmOpen(true);
  };

  // 3. Confirm Action with Password
  const handleConfirmAction = async (adminPassword) => {
    setIsSaving(true);
    try {
      if (pendingAction === 'SAVE') {
        const permsToSave = currentTab === 'Admin' ? Array.from(adminPermissions) : Array.from(salespersonPermissions);
        await api.put(`/permissions/${currentTab}`, {
          allowedPermissions: permsToSave,
          adminPassword // Pass password to backend
        });
        toast.success(`'${currentTab}' role permissions have been updated.`);
      } else if (pendingAction === 'RESET') {
        await api.post('/permissions/seed', {
          adminPassword // Pass password to backend
        });
        toast.success('Permissions successfully reset to default.');
        await fetchData(); // Refresh data after reset
      }
    } catch (error) {
      console.error(`Failed to execute ${pendingAction}`, error);
      toast.error(error.response?.data?.message || 'Action failed.');
    } finally {
      setIsSaving(false);
      setPendingAction(null);
    }
  };

  const groupedPerms = groupPermissions(allPermissions);
  const currentPerms = currentTab === 'Admin' ? adminPermissions : salespersonPermissions;

  return (
    <Box>
      {/* --- Security Modal --- */}
      <AdminConfirmPasswordModal
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmAction}
      />

      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 2 }}>
        Role Permission Management
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
          <Tabs value={currentTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Admin Role" value="Admin" />
            <Tab label="Salesperson Role" value="Salesperson" />
          </Tabs>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<RestartAltIcon />}
            onClick={handleInitiateReset} // Opens modal now
            disabled={isLoading || isSaving}
            sx={{ mt: { xs: 2, md: 0 } }}
          >
            Reset All to Default
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {isLoading ? (
          <Grid container spacing={3}>
            {[...Array(4)].map((_, i) => (
              <Grid item xs={12} md={6} lg={4} key={i}>
                <Skeleton variant="text" width="40%" height={40} />
                <Skeleton variant="rectangular" width="100%" height={120} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={3}>
            {Object.keys(groupedPerms).map((category) => (
              <Grid item xs={12} md={6} lg={4} key={category}>
                <Typography variant="h6" gutterBottom>{category}</Typography>
                <FormGroup>
                  {groupedPerms[category].map((perm) => (
                    <FormControlLabel
                      key={perm.key}
                      control={
                        <Checkbox
                          checked={currentPerms.has(perm.key)}
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
            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            disabled={isLoading || isSaving}
            onClick={handleInitiateSave} // Opens modal
          >
            Save {currentTab} Permissions
          </Button>
        </Box>

        <Alert severity="info" sx={{ mt: 3 }}>
          <strong>Note:</strong> 'Super Admin' role always has all permissions by default and cannot be changed.
        </Alert>
      </Paper>
    </Box>
  );
};

export default PermissionManagementPage;