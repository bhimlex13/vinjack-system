// client/src/pages/PermissionManagementPage.js
import React, { useState, useEffect, useCallback, useContext }
  from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import {
  Box, Typography, Paper, Grid, Checkbox, FormControlLabel,
  FormGroup, Button, CircularProgress, Divider, Alert,
  Tabs, Tab, Skeleton
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ConfirmationContext from '../context/ConfirmationContext';

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
  const confirm = useContext(ConfirmationContext);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
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
      // --- UPDATED: Show the specific error from the API ---
      toast.error(error.response?.data?.message || 'Failed to load permissions.');
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
        if (checked) {
          newSet.add(name);
        } else {
          newSet.delete(name);
        }
        return newSet;
      });
    } else {
      setSalespersonPermissions(prev => {
        const newSet = new Set(prev);
        if (checked) {
          newSet.add(name);
        } else {
          newSet.delete(name);
        }
        return newSet;
      });
    }
  };

  const handleSavePermissions = async () => {
    setIsSaving(true);
    try {
      const permsToSave = currentTab === 'Admin' ? Array.from(adminPermissions) : Array.from(salespersonPermissions);
      
      await api.put(`/permissions/${currentTab}`, {
        allowedPermissions: permsToSave
      });
      
      toast.success(`'${currentTab}' role permissions have been updated.`);
    } catch (error) {
      console.error(`Failed to save ${currentTab} permissions`, error);
      toast.error(error.response?.data?.message || 'Failed to save permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeedPermissions = async () => {
    try {
      await confirm({
        title: 'Confirm Reset',
        description: 'Are you sure you want to reset all permissions? This will restore both Admin and Salesperson roles to their original default settings.'
      });
      
      setIsLoading(true);
      await api.post('/permissions/seed'); // This is the API call
      toast.success('Permissions successfully reset to default.');
      await fetchData(); // Refetch data to show the new defaults

    } catch (error) {
      if (error) { 
         console.error("Failed to seed permissions", error);
         toast.error(error.response?.data?.message || 'Failed to reset permissions.');
      }
    } finally {
       setIsLoading(false);
    }
  };

  const groupedPerms = groupPermissions(allPermissions);
  const currentPerms = currentTab === 'Admin' ? adminPermissions : salespersonPermissions;

  return (
    <Box>
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
            onClick={handleSeedPermissions}
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
              // --- FIXED: Removed 'item' prop ---
              <Grid xs={12} md={6} lg={4} key={i}>
                <Skeleton variant="text" width="40%" height={40} />
                <Skeleton variant="rectangular" width="100%" height={120} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={3}>
            {Object.keys(groupedPerms).map((category) => (
              // --- FIXED: Removed 'item' prop ---
              <Grid xs={12} md={6} lg={4} key={category}>
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
            onClick={handleSavePermissions}
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