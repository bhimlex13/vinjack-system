// client/src/pages/SettingsPage.js
import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import AuthContext from '../context/AuthContext';
import { triggerManualBackupToGCS, restoreBackup, listGCSBackups } from '../api/settingsApi';
import { toast } from 'react-toastify';

// MUI Imports
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  FormControlLabel,
  Switch,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RestoreIcon from '@mui/icons-material/Restore';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import SecurityIcon from '@mui/icons-material/Security';
import AssessmentIcon from '@mui/icons-material/Assessment';


const SettingsPage = () => {
  const { user, logout } = useContext(AuthContext);
  
  // Profile state (Read-Only)
  const [profile, setProfile] = useState({ fullName: '', username: '', email: '' });

  // Notification state
  const [personalSettings, setPersonalSettings] = useState({
    notificationsEnabled: true,
    notificationTime: '08:00',
    dailySalesReportEnabled: false,
    dailySalesReportTime: '08:30'
  });
  const [originalPersonalSettings, setOriginalPersonalSettings] = useState({});
  const [isNotificationSaving, setIsNotificationSaving] = useState(false);

  // Backup Settings State
  const [backupSettings, setBackupSettings] = useState({ enabled: false, time: '02:00' });
  const [originalBackupSettings, setOriginalBackupSettings] = useState({});
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isBackupSaving, setIsBackupSaving] = useState(false);

  // GCS Backup & Restore State
  const [isBackingUpToGCS, setIsBackingUpToGCS] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [gcsBackups, setGcsBackups] = useState([]);
  const [selectedRestoreFile, setSelectedRestoreFile] = useState('');
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);


  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
       if (!user) return;
       setIsBackupLoading(true);
       try {
         const apiCalls = [
           api.get('/settings'), // Personal settings
           api.get('/users/me') // User profile
         ];
         if (user.role === 'Super Admin') {
           apiCalls.push(api.get('/settings/backup/config'));
         }
         const responses = await Promise.all(apiCalls);

         if (responses[0]?.data) {
           setPersonalSettings(responses[0].data);
           setOriginalPersonalSettings(responses[0].data);
         }
         if (responses[1]?.data) {
           const userProfile = {
             fullName: responses[1].data.fullName || '',
             username: responses[1].data.username || '',
             email: responses[1].data.email || ''
           };
           setProfile(userProfile);
         }
         if (user.role === 'Super Admin' && responses[2]?.data) {
           setBackupSettings(responses[2].data);
           setOriginalBackupSettings(responses[2].data);
         }
       } catch (error) {
         console.error("Failed to fetch settings data", error);
         toast.error("Failed to load some settings.");
       } finally {
         setIsBackupLoading(false);
       }
    };
    fetchData();
  }, [user]);

  // Check for restore flag
  useEffect(() => {
    const restoreFlag = localStorage.getItem('restoreCompleted');
    if (restoreFlag) {
        toast.success("Database restore completed successfully. Please log in again.", { autoClose: 7000 });
        localStorage.removeItem('restoreCompleted');
    }
  }, []);

  // Fetch GCS Backup List
  useEffect(() => {
    if (user?.role === 'Super Admin') {
        const fetchBackupList = async () => {
            setIsLoadingBackups(true);
            try {
                const backups = await listGCSBackups();
                setGcsBackups(backups);
            } catch (error) {
                console.error("Failed to fetch GCS backup list:", error);
                toast.error(error.response?.data?.message || "Could not load backup list from GCS.");
            } finally {
                setIsLoadingBackups(false);
            }
        };
        fetchBackupList();
    }
  }, [user]);

  // Generic save function for personal settings
  const savePersonalSetting = async (settingKey, value, successMessage) => {
    setIsNotificationSaving(true);
    const newSettings = { ...personalSettings, [settingKey]: value };
    setPersonalSettings(newSettings); // Optimistic UI update

    try {
        await api.put('/settings', newSettings); // Send the whole object
        toast.success(successMessage);
        setOriginalPersonalSettings(newSettings); // Set new baseline
    }
    catch (err){
        toast.error(err.response?.data?.message || 'Failed to update setting.');
        setPersonalSettings(originalPersonalSettings); // Revert on error
        console.error(err);
    } finally {
        setIsNotificationSaving(false);
    }
  };

  // Handle Low Stock Notification Toggle
  const handleNotificationToggle = (event) => {
    const isEnabled = event.target.checked;
    savePersonalSetting('notificationsEnabled', isEnabled, `Low stock alerts ${isEnabled ? 'enabled' : 'disabled'}.`);
  };

  // Handle Low Stock Notification Time Save on Blur
  const handleNotificationTimeBlur = () => {
    if (personalSettings.notificationTime === originalPersonalSettings.notificationTime) return;
    if (!personalSettings.notificationsEnabled) return;
    if (!/^\d{2}:\d{2}$/.test(personalSettings.notificationTime)) {
        toast.error("Invalid time format. Please use HH:MM.");
        setPersonalSettings(originalPersonalSettings);
        return;
    }
    savePersonalSetting('notificationTime', personalSettings.notificationTime, 'Low stock alert time updated.');
  };

  // Handle Daily Report Toggle
  const handleDailyReportToggle = (event) => {
    const isEnabled = event.target.checked;
    savePersonalSetting('dailySalesReportEnabled', isEnabled, `Daily sales report ${isEnabled ? 'enabled' : 'disabled'}.`);
  };

  // Handle Daily Report Time Save on Blur
  const handleDailyReportTimeBlur = () => {
    if (personalSettings.dailySalesReportTime === originalPersonalSettings.dailySalesReportTime) return;
    if (!personalSettings.dailySalesReportEnabled) return;
    if (!/^\d{2}:\d{2}$/.test(personalSettings.dailySalesReportTime)) {
        toast.error("Invalid time format. Please use HH:MM.");
        setPersonalSettings(originalPersonalSettings);
        return;
    }
    savePersonalSetting('dailySalesReportTime', personalSettings.dailySalesReportTime, 'Daily sales report time updated.');
  };

  // Backup Settings Logic
  const handleBackupTimeChange = (e) => {
    setBackupSettings(prev => ({ ...prev, time: e.target.value }));
  };
  const handleBackupToggle = async (event) => {
      const isEnabled = event.target.checked;
      setIsBackupSaving(true);
      const settingsToSave = { ...backupSettings, enabled: isEnabled };
      if (isEnabled && !/^\d{2}:\d{2}$/.test(settingsToSave.time)) {
          toast.error('Invalid time format. Cannot enable schedule.');
          setIsBackupSaving(false);
          return;
      }
      setBackupSettings(settingsToSave); 
      try {
          await api.put('/settings/backup/config', settingsToSave);
          setOriginalBackupSettings(settingsToSave);
          toast.success(`Automated backup schedule ${isEnabled ? 'enabled' : 'disabled'}.`);
      } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to update backup schedule setting.');
          setBackupSettings(originalBackupSettings);
          console.error(err);
      } finally {
          setIsBackupSaving(false);
      }
  };
  const handleBackupTimeBlur = async () => {
    if (!backupSettings.enabled) return;
    if (backupSettings.time === originalBackupSettings.time) return;
    if (!/^\d{2}:\d{2}$/.test(backupSettings.time)) {
        toast.error('Invalid backup time format.');
        setBackupSettings(originalBackupSettings);
        return;
    }
    const settingsToSave = backupSettings;
    setIsBackupSaving(true);
    try {
      await api.put('/settings/backup/config', settingsToSave);
      setOriginalBackupSettings(settingsToSave);
      toast.success('Backup time updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save backup time.');
      setBackupSettings(originalBackupSettings);
    } finally {
      setIsBackupSaving(false);
    }
  };


  // GCS Backup & Restore Logic
  const handleTriggerBackupToGCS = async () => {
    setIsBackingUpToGCS(true);
    toast.info('Starting manual backup to Google Cloud Storage...');
    try {
      const response = await triggerManualBackupToGCS();
      toast.success(response.message || 'Manual backup to GCS completed!');
      const backups = await listGCSBackups();
      setGcsBackups(backups);
    } catch (err) {
      console.error('Manual backup to GCS error:', err);
      toast.error(err.response?.data?.message || 'Failed to trigger manual backup to GCS.');
    } finally {
      setIsBackingUpToGCS(false);
    }
  };
  const handleRestoreFileSelectChange = (event) => {
    setSelectedRestoreFile(event.target.value);
  };
  const handleRestoreSubmit = () => {
    if (!selectedRestoreFile) {
      toast.error('Please select a backup file from the list to restore.');
      return;
    }
    setShowRestoreConfirm(true);
  };
  const confirmRestore = async () => {
    if (!selectedRestoreFile) return;
    setShowRestoreConfirm(false);
    setIsRestoring(true);
    toast.info('Restoring database from GCS... Please do not close this page. You will be logged out upon completion.', { autoClose: false });
    try {
      const response = await restoreBackup(selectedRestoreFile);
      toast.dismiss();
      toast.success(response.message || 'Restore successful! Logging out...');
      setSelectedRestoreFile('');
      localStorage.setItem('restoreCompleted', 'true');
      setTimeout(() => {
        logout();
      }, 3000);
    } catch (err) {
      toast.dismiss();
      console.error('Restore error:', err);
      toast.error(err.response?.data?.message || 'Failed to restore database from GCS.');
      setIsRestoring(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          My Settings
      </Typography>

      <Grid container spacing={3}>

        {/* --- Profile Section (READ ONLY) --- */}
        <Grid size={{ xs: 12 }}>
            <Paper elevation={3} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                    <AccountCircleIcon color="action" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="h3">My Profile</Typography>
                </Box>
                <List dense sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                  <ListItem><ListItemIcon><BadgeIcon /></ListItemIcon><ListItemText primary="Full Name" secondary={profile.fullName} /></ListItem>
                  <ListItem><ListItemIcon><AccountCircleIcon /></ListItemIcon><ListItemText primary="Username" secondary={profile.username} /></ListItem>
                  <ListItem><ListItemIcon><EmailIcon /></ListItemIcon><ListItemText primary="Email" secondary={profile.email} /></ListItem>
                  <ListItem><ListItemIcon><VpnKeyIcon /></ListItemIcon><ListItemText primary="Password" secondary="********" /></ListItem>
                </List>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
                    Note: To update profile details or change password, please contact the Administrator or the Owner.
                </Typography>
            </Paper>
        </Grid>

        {/* --- Notifications Section --- */}
        <Grid size={{ xs: 12 }}>
            <Paper elevation={3} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                 <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                    <NotificationsIcon color="action" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="h3">Email Notification Settings</Typography>
                </Box>
                <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                    {/* Low Stock Alert */}
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 2 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={personalSettings.notificationsEnabled}
                              onChange={handleNotificationToggle}
                              name="notificationsEnabled"
                              disabled={isNotificationSaving}
                            />
                          }
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <WarningAmberIcon sx={{ mr: 1, fontSize: '1.25rem', color: 'text.secondary' }} />
                              Enable Low Stock Email Alerts
                              {isNotificationSaving && personalSettings.notificationsEnabled !== originalPersonalSettings.notificationsEnabled && <CircularProgress size={16} sx={{ ml: 1 }} />}
                            </Box>
                          }
                          sx={{ mr: 'auto', width: '100%' }}
                        />
                        <TextField
                            label="Low Stock Alert Time"
                            type="time"
                            value={personalSettings.notificationTime}
                            onChange={(e) => setPersonalSettings(p => ({ ...p, notificationTime: e.target.value }))}
                            onBlur={handleNotificationTimeBlur}
                            disabled={!personalSettings.notificationsEnabled || isNotificationSaving}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ step: 300 }}
                            helperText="Saves on blur."
                            sx={{ width: { xs: '100%', sm: '200px' } }}
                            size="small"
                        />
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Daily Sales Report */}
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={personalSettings.dailySalesReportEnabled}
                              onChange={handleDailyReportToggle} 
                              name="dailySalesReportEnabled"
                              disabled={isNotificationSaving}
                            />
                          }
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <AssessmentIcon sx={{ mr: 1, fontSize: '1.25rem', color: 'text.secondary' }} />
                              Enable Daily Sales Report Email
                              {isNotificationSaving && personalSettings.dailySalesReportEnabled !== originalPersonalSettings.dailySalesReportEnabled && <CircularProgress size={16} sx={{ ml: 1 }} />}
                            </Box>
                          }
                          sx={{ mr: 'auto', width: '100%' }}
                        />
                        <TextField
                            label="Daily Report Time"
                            type="time"
                            value={personalSettings.dailySalesReportTime}
                            onChange={(e) => setPersonalSettings(p => ({ ...p, dailySalesReportTime: e.target.value }))}
                            onBlur={handleDailyReportTimeBlur} 
                            disabled={!personalSettings.dailySalesReportEnabled || isNotificationSaving}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ step: 300 }} 
                            helperText="Saves on blur."
                            sx={{ width: { xs: '100%', sm: '200px' } }}
                            size="small"
                        />
                    </Box>

                </Box>
                 <Box sx={{ mt: 'auto', pt: 2, flexShrink: 0, height: '40px' }}></Box>
            </Paper>
        </Grid>
        
        {/* --- Backup Settings (Super Admin Only) --- */}
        {user?.role === 'Super Admin' && (
          <Grid size={{ xs: 12 }}>
            <Paper elevation={3} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                 <SettingsBackupRestoreIcon color="action" sx={{ mr: 1 }} />
                 <Typography variant="h6" component="h3">Automated Backup Settings</Typography>
              </Box>
              <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                  {isBackupLoading ? (
                     <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress size={24} /></Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={backupSettings.enabled}
                            onChange={handleBackupToggle}
                            name="enabled"
                            disabled={isBackupLoading || isBackupSaving}
                          />
                        }
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                Enable Daily Automated Backups to GCS
                                {isBackupSaving && <CircularProgress size={16} sx={{ ml: 1 }} />}
                            </Box>
                        }
                        sx={{ mr: 2, width: '100%' }}
                      />
                      <TextField
                        label="Scheduled Backup Time"
                        type="time"
                        value={backupSettings.time}
                        onChange={handleBackupTimeChange}
                        onBlur={handleBackupTimeBlur}
                        name="timeInput"
                        disabled={!backupSettings.enabled || isBackupLoading || isBackupSaving}
                        helperText="Saves automatically."
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ step: 300 }}
                        sx={{ width: { xs: '100%', sm: '220px' } }} 
                      />
                    </Box>
                  )}
              </Box>
              <Box sx={{ mt: 'auto', pt: 2, flexShrink: 0, height: '40px' }}>
              </Box>
            </Paper>
          </Grid>
        )}

        {/* --- Manual Backup & Restore (Super Admin Only) --- */}
        {user?.role === 'Super Admin' && (
          <Grid size={{ xs: 12 }}>
             <Paper elevation={3} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
               <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                 <SecurityIcon color="action" sx={{ mr: 1 }} />
                 <Typography variant="h6" component="h3">Manual Backup & Restore (GCS)</Typography>
              </Box>
              <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Manually trigger a database backup to Google Cloud Storage.
                    </Typography>
                    <Button
                      variant="contained" color="info"
                      startIcon={isBackingUpToGCS ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
                      onClick={handleTriggerBackupToGCS}
                      disabled={isBackingUpToGCS || isRestoring}
                      sx={{mb: 2, width: { xs: '100%', sm: 'auto' }}}
                    >
                      {isBackingUpToGCS ? 'Backing Up...' : 'Backup Now to GCS'}
                    </Button>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box>
                    <Typography variant="body2" color="error" gutterBottom sx={{ fontWeight: 'bold' }}>
                      <WarningAmberIcon sx={{ fontSize: '1rem', verticalAlign: 'middle', mr: 0.5 }} />
                      WARNING: Restoring will overwrite ALL current data.
                    </Typography>
                    <FormControl fullWidth margin="normal" disabled={isLoadingBackups || isRestoring || isBackingUpToGCS}>
                        <InputLabel id="gcs-backup-select-label">Select Backup to Restore from GCS</InputLabel>
                        <Select
                            labelId="gcs-backup-select-label" id="gcs-backup-select"
                            value={selectedRestoreFile} label="Select Backup to Restore from GCS"
                            onChange={handleRestoreFileSelectChange}
                        >
                            <MenuItem value="" disabled sx={{ fontStyle: 'italic' }}>
                                {isLoadingBackups ? 'Loading backups...' : (gcsBackups.length === 0 ? 'No backups found in GCS' : 'Select a backup file...')}
                            </MenuItem>
                            {gcsBackups.map((backup) => (
                                <MenuItem key={backup.name} value={backup.name}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                        <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mr: 2 }}>{backup.name}</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                                            {new Date(backup.timeCreated).toLocaleString()} ({`${(backup.size / 1024 / 1024).toFixed(2)} MB`})
                                        </Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                        {!isLoadingBackups && gcsBackups.length > 0 && <FormHelperText>Backups are listed newest first.</FormHelperText>}
                    </FormControl>
                    <Box sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-end' }, mt: 2 }}>
                      <Button
                        variant="contained" color="error"
                        startIcon={isRestoring ? <CircularProgress size={20} color="inherit" /> : <RestoreIcon />}
                        onClick={handleRestoreSubmit}
                        disabled={!selectedRestoreFile || isRestoring || isLoadingBackups || isBackingUpToGCS}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                      >
                        {isRestoring ? 'Restoring...' : 'Restore Selected Backup'}
                      </Button>
                    </Box>
                  </Box>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* --- Restore Confirmation Modal --- */}
      <Dialog open={showRestoreConfirm} onClose={() => !isRestoring && setShowRestoreConfirm(false)} >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <WarningAmberIcon color="error" sx={{ mr: 1 }} />
          Confirm Database Restore from GCS
        </DialogTitle>
        <DialogContent>
          <DialogContentText gutterBottom>
            You are about to restore the database from the Google Cloud Storage file:
          </DialogContentText>
          <Typography variant="body2" sx={{ fontWeight: 'bold', my: 1, wordBreak: 'break-all' }}>
            {selectedRestoreFile || 'N/A'}
          </Typography>
          <DialogContentText color="error" sx={{ fontWeight: 'bold' }}>
            This will permanently DELETE all current data and replace it with the data from this backup file. This action CANNOT be undone.
          </DialogContentText>
          <DialogContentText sx={{ mt: 2 }}>
            Are you sure you want to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRestoreConfirm(false)} disabled={isRestoring}>
            Cancel
          </Button>
          <Button onClick={confirmRestore} color="error" variant="contained" disabled={isRestoring}>
            {isRestoring ? <CircularProgress size={24} color="inherit" /> : 'Yes, Restore Now'}
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
};

export default SettingsPage;