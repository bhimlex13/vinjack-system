// client/src/pages/SettingsPage.js
import React, { useState, useEffect, useContext, useRef } from 'react';
import api from '../api/axios';
import AuthContext from '../context/AuthContext';
import { requestProfileUpdate, verifyOwnerUpdate } from '../api/userApi';
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
  Alert,
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
  InputAdornment, // Keep this if used elsewhere, though we remove it from backup
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  IconButton,
  Stack // Keep Stack if used
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
// import SaveIcon from '@mui/icons-material/Save'; // No longer used
import AccessTimeIcon from '@mui/icons-material/AccessTime'; // No longer used for backup time
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RestoreIcon from '@mui/icons-material/Restore';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import SecurityIcon from '@mui/icons-material/Security';

// --- REMOVED Time Conversion Helpers ---
// const formatTo12Hour = ...
// const formatTo24Hour = ...


const SettingsPage = () => {
  const { user, logout } = useContext(AuthContext);
  // Profile state remains unchanged
  const [profile, setProfile] = useState({ fullName: '', username: '', email: '' });
  const [originalProfile, setOriginalProfile] = useState({});
  const [pendingChanges, setPendingChanges] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateFormData, setUpdateFormData] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [changesSummary, setChangesSummary] = useState([]);
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [timer, setTimer] = useState(180);
  const timerId = useRef(null);

  // Notification state
  const [personalSettings, setPersonalSettings] = useState({ notificationsEnabled: true, notificationTime: '08:00' });
  const [originalPersonalSettings, setOriginalPersonalSettings] = useState({});
  const [isNotificationSaving, setIsNotificationSaving] = useState(false);

  // --- MODIFIED: Automated Backup Settings State ---
  const [backupSettings, setBackupSettings] = useState({ enabled: false, time: '02:00' });
  // --- NEW: Store original backup settings ---
  const [originalBackupSettings, setOriginalBackupSettings] = useState({});
  // --- REMOVED: backupTimeInput, originalBackupTimeInput, backupTimeError ---
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isBackupSaving, setIsBackupSaving] = useState(false);

  // GCS Backup & Restore State (unchanged)
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
         if (user.role === 'Owner') {
           apiCalls.push(api.get('/settings/backup/config'));
         }
         const responses = await Promise.all(apiCalls);

         // Process personal settings (unchanged)
         if (responses[0]?.data) {
           setPersonalSettings(responses[0].data);
           setOriginalPersonalSettings(responses[0].data);
         }

         // Process user profile (unchanged)
         if (responses[1]?.data) {
           const userProfile = {
             fullName: responses[1].data.fullName || '',
             username: responses[1].data.username || '',
             email: responses[1].data.email || ''
           };
           setProfile(userProfile);
           setOriginalProfile(userProfile);
           if (responses[1].data.hasPendingChanges) {
             setPendingChanges(responses[1].data.pendingChanges);
           }
         }

         // --- MODIFIED: Process backup config ---
         if (user.role === 'Owner' && responses[2]?.data) {
           setBackupSettings(responses[2].data);
           // --- Store original state ---
           setOriginalBackupSettings(responses[2].data);
           // --- REMOVED: setBackupTimeInput, setOriginalBackupTimeInput, setBackupTimeError ---
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

  // Check for restore flag (unchanged)
  useEffect(() => { /* ... unchanged ... */
    const restoreFlag = localStorage.getItem('restoreCompleted');
    if (restoreFlag) {
        toast.success("Database restore completed successfully. Please log in again.", { autoClose: 7000 });
        localStorage.removeItem('restoreCompleted'); // Remove the flag after showing message
    }
  }, []);

  // Timer logic (unchanged)
   useEffect(() => { /* ... unchanged ... */
     if (requiresVerification && timer > 0) {
       timerId.current = setInterval(() => setTimer(prev => prev - 1), 1000);
     } else {
       clearInterval(timerId.current);
       if (timer <= 0 && requiresVerification) {
         setUpdateError("Time has expired. Please request a new code.");
       }
     }
     return () => clearInterval(timerId.current);
   }, [requiresVerification, timer]);

   // --- MODIFIED: formatTime (only used for profile update timer) ---
   const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
   // --- END MODIFICATION ---

  // Fetch GCS Backup List (unchanged)
  useEffect(() => { /* ... unchanged ... */
    if (user?.role === 'Owner') {
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

  // Handle Notification Switch Toggle (unchanged)
  const handleNotificationToggle = async (event) => {
    const isEnabled = event.target.checked;
    setIsNotificationSaving(true);
    const newSettings = { ...personalSettings, notificationsEnabled: isEnabled };
    setPersonalSettings(newSettings);
    try {
        await api.put('/settings', newSettings);
        toast.success(`Email alerts ${isEnabled ? 'enabled' : 'disabled'}.`);
        setOriginalPersonalSettings(newSettings);
    }
    catch (err){
        toast.error(err.response?.data?.message || 'Failed to update notification setting.');
        setPersonalSettings(originalPersonalSettings);
        console.error(err);
    } finally {
        setIsNotificationSaving(false);
    }
  };

  // Handle Notification Time Save on Blur (unchanged)
  const handleNotificationTimeBlur = async () => {
    if (personalSettings.notificationTime === originalPersonalSettings.notificationTime) {
      return;
    }
    if (!personalSettings.notificationsEnabled) {
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(personalSettings.notificationTime)) {
        toast.error("Invalid time format. Please use HH:MM.");
        setPersonalSettings(originalPersonalSettings);
        return;
    }

    setIsNotificationSaving(true);
    try {
        await api.put('/settings', personalSettings); // Send the whole object
        toast.success('Notification time updated.');
        setOriginalPersonalSettings(personalSettings);
    } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to update notification time.');
        setPersonalSettings(originalPersonalSettings);
        console.error(err);
    } finally {
        setIsNotificationSaving(false);
    }
  };

  // --- REMOVED: handleBackupTimeInputChange function ---

  // --- NEW: Handle Backup Time Input Change ---
  const handleBackupTimeChange = (e) => {
    setBackupSettings(prev => ({ ...prev, time: e.target.value }));
  };
  // --- END NEW ---

  // --- MODIFIED: Handle Automated Backup Switch Toggle (simplified) ---
  const handleBackupToggle = async (event) => {
      const isEnabled = event.target.checked;
      setIsBackupSaving(true);
      
      // Settings to save are the current settings, just with the new 'enabled' state
      const settingsToSave = { ...backupSettings, enabled: isEnabled };

      // No more 12/24h validation needed here
      if (isEnabled && !/^\d{2}:\d{2}$/.test(settingsToSave.time)) {
          toast.error('Invalid time format. Cannot enable schedule.');
          setIsBackupSaving(false);
          return; // Stop saving
      }

      // Optimistic UI update for the switch
      setBackupSettings(settingsToSave); 

      try {
          await api.put('/settings/backup/config', settingsToSave);
          // Update the original state on successful save
          setOriginalBackupSettings(settingsToSave);
          toast.success(`Automated backup schedule ${isEnabled ? 'enabled' : 'disabled'}.`);
      } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to update backup schedule setting.');
          // Revert UI state on error
          setBackupSettings(originalBackupSettings); // Revert to last saved state
          console.error(err);
      } finally {
          setIsBackupSaving(false);
      }
  };
  // --- END MODIFICATION ---

  // --- MODIFIED: Handle Backup Time Save on Blur (simplified) ---
  const handleBackupTimeBlur = async () => {
    // Don't save if the schedule is disabled
    if (!backupSettings.enabled) {
      return;
    }
    // Don't save if the time hasn't changed
    if (backupSettings.time === originalBackupSettings.time) {
      return;
    }
    // Basic validation
    if (!/^\d{2}:\d{2}$/.test(backupSettings.time)) {
        toast.error('Invalid backup time format.');
        setBackupSettings(originalBackupSettings); // Revert
        return;
    }
    
    // settingsToSave is just the current state
    const settingsToSave = backupSettings;
    
    setIsBackupSaving(true);
    try {
      await api.put('/settings/backup/config', settingsToSave);
      setOriginalBackupSettings(settingsToSave); // Update original state
      toast.success('Backup time updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save backup time.');
      setBackupSettings(originalBackupSettings); // Revert
      console.error(err);
    } finally {
      setIsBackupSaving(false);
    }
  };
  // --- END MODIFICATION ---


  // GCS Backup & Restore Logic (remains unchanged)
  const handleTriggerBackupToGCS = async () => { /* ... unchanged ... */
    setIsBackingUpToGCS(true);
    toast.info('Starting manual backup to Google Cloud Storage...');
    try {
      const response = await triggerManualBackupToGCS(); // Calls POST endpoint
      toast.success(response.message || 'Manual backup to GCS completed!');
      // Refresh the backup list
      const backups = await listGCSBackups();
      setGcsBackups(backups);
    } catch (err) {
      console.error('Manual backup to GCS error:', err);
      toast.error(err.response?.data?.message || 'Failed to trigger manual backup to GCS.');
    } finally {
      setIsBackingUpToGCS(false);
    }
  };
  const handleRestoreFileSelectChange = (event) => { /* ... unchanged ... */
    setSelectedRestoreFile(event.target.value);
  };
  const handleRestoreSubmit = () => { /* ... unchanged ... */
    if (!selectedRestoreFile) {
      toast.error('Please select a backup file from the list to restore.');
      return;
    }
    setShowRestoreConfirm(true);
  };
  const confirmRestore = async () => { /* ... unchanged ... */
    if (!selectedRestoreFile) return;

    setShowRestoreConfirm(false);
    setIsRestoring(true);
    toast.info('Restoring database from GCS... Please do not close this page. You will be logged out upon completion.', { autoClose: false });

    try {
      const response = await restoreBackup(selectedRestoreFile); // Pass filename

      toast.dismiss();
      toast.success(response.message || 'Restore successful! Logging out...');
      setSelectedRestoreFile(''); // Clear selection

      localStorage.setItem('restoreCompleted', 'true'); // Set flag

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

  // Profile Update Logic (remains unchanged)
  const openUpdateModal = () => { /* ... unchanged ... */
    setUpdateFormData({
      fullName: profile.fullName, username: profile.username, email: profile.email,
      oldPassword: '', newPassword: '', confirmPassword: ''
    });
    setUpdateError('');
    setShowUpdateModal(true);
  };
  const closeUpdateModal = () => { /* ... unchanged ... */
    setShowUpdateModal(false);
    setUpdateError('');
    setUpdateMessage('');
    setRequiresVerification(false);
    setVerificationCode('');
    setTimer(180);
    clearInterval(timerId.current);
  };
  const openConfirmModal = (e) => { /* ... unchanged ... */
    e.preventDefault();
    setUpdateError('');
    const changes = [];
    if (updateFormData.fullName && updateFormData.fullName !== originalProfile.fullName) changes.push({ field: 'Full Name', oldValue: originalProfile.fullName, newValue: updateFormData.fullName });
    if (updateFormData.username && updateFormData.username !== originalProfile.username) changes.push({ field: 'Username', oldValue: originalProfile.username, newValue: updateFormData.username });
    if (updateFormData.email && updateFormData.email !== originalProfile.email) changes.push({ field: 'Email', oldValue: originalProfile.email, newValue: updateFormData.email });
    if (updateFormData.newPassword) {
      if (!updateFormData.oldPassword) { setUpdateError('Old password is required to change password.'); return; }
      if (updateFormData.newPassword !== updateFormData.confirmPassword) { setUpdateError('New passwords do not match.'); return; }
      if (updateFormData.newPassword.length < 6) { setUpdateError('New password must be at least 6 characters long.'); return; }
      changes.push({ field: 'Password', oldValue: '********', newValue: '********' });
    }
    if (changes.length === 0) { setUpdateError('No changes detected to submit.'); return; }
    setChangesSummary(changes);
    setShowConfirmModal(true);
  };
  const confirmProfileUpdate = async () => { /* ... unchanged ... */
    setUpdateError(''); setUpdateMessage('');
    setIsBackupSaving(true); // Reuse saving state
    try {
      const response = await requestProfileUpdate(updateFormData);
      setShowConfirmModal(false);
      if (response.data.requiresVerification) {
        setRequiresVerification(true);
        setUpdateMessage(response.data.message);
        setTimer(180);
      } else {
        setUpdateMessage(response.data.message);
        if (user.role !== 'Owner') {
            setPendingChanges({ /* Store relevant pending changes if needed */ });
        }
        setShowSuccessModal(true);
      }
    } catch (err) {
      setUpdateError(err.response?.data?.message || 'Failed to request profile update.');
      setShowConfirmModal(false);
    } finally {
        setIsBackupSaving(false);
    }
  };
  const handleVerificationSubmit = async (e) => { /* ... unchanged ... */
    e.preventDefault(); setUpdateError('');
    setIsBackupSaving(true); // Reuse saving state
    try {
      const response = await verifyOwnerUpdate(verificationCode);
      setUpdateMessage(response.data.message);
      const updatedProfile = {
          fullName: updateFormData.fullName || profile.fullName,
          username: updateFormData.username || profile.username,
          email: updateFormData.email || profile.email
      };
      setProfile(updatedProfile);
      setOriginalProfile(updatedProfile);
      setPendingChanges(null);
      setShowSuccessModal(true);
    } catch (err) {
      setUpdateError(err.response?.data?.message || 'Verification failed.');
    } finally {
        setIsBackupSaving(false);
    }
   };
   const handleCloseSuccessModal = () => { /* ... unchanged ... */
       setShowSuccessModal(false);
       closeUpdateModal(); // Close the main modal too
   };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          My Settings
      </Typography>

      <Grid container spacing={3}>

        {/* Profile Section (unchanged) */}
        <Grid item size={{ xs: 12 }} >
            {/* ... unchanged Profile JSX ... */}
            <Paper elevation={3} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                    <AccountCircleIcon color="action" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="h3">My Profile</Typography>
                </Box>
                {pendingChanges && user.role !== 'Owner' && <Alert severity="info" sx={{ mb: 2 }}>You have pending profile changes awaiting owner approval.</Alert>}
                <List dense sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                  <ListItem><ListItemIcon><BadgeIcon /></ListItemIcon><ListItemText primary="Full Name" secondary={profile.fullName} /></ListItem>
                  <ListItem><ListItemIcon><AccountCircleIcon /></ListItemIcon><ListItemText primary="Username" secondary={profile.username} /></ListItem>
                  <ListItem><ListItemIcon><EmailIcon /></ListItemIcon><ListItemText primary="Email" secondary={profile.email} /></ListItem>
                  <ListItem><ListItemIcon><VpnKeyIcon /></ListItemIcon><ListItemText primary="Password" secondary="********" /></ListItem>
                </List>
                <Box sx={{ mt: 'auto', pt: 2, flexShrink: 0 }}>
                    <Button variant="contained" onClick={openUpdateModal} disabled={!!pendingChanges && user.role !== 'Owner'}>
                        Request Profile Update
                    </Button>
                </Box>
            </Paper>
        </Grid>

        {/* Notification Settings Section (unchanged) */}
        <Grid item size={{ xs: 12 }}>
            <Paper elevation={3} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                 <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                    <NotificationsIcon color="action" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="h3">Notification Settings</Typography>
                </Box>
                <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
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
                          Enable Low Stock Email Alerts
                          {isNotificationSaving && <CircularProgress size={16} sx={{ ml: 1 }} />}
                        </Box>
                      }
                    />
                    <TextField
                        label="Notification Time (Manila Time)"
                        type="time"
                        fullWidth
                        value={personalSettings.notificationTime}
                        onChange={(e) => setPersonalSettings(p => ({ ...p, notificationTime: e.target.value }))}
                        onBlur={handleNotificationTimeBlur}
                        disabled={!personalSettings.notificationsEnabled || isNotificationSaving}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ step: 300 }} // 5 min step
                        helperText="Emails will be sent daily around this time. Time saves automatically when you click away."
                        sx={{ mt: 2 }}
                    />
                </Box>
                 <Box sx={{ mt: 'auto', pt: 2, flexShrink: 0, height: '40px' }}></Box>
            </Paper>
        </Grid>
        
        {/* --- MODIFIED: Automated Backup Settings Section (Owner Only) --- */}
        {user?.role === 'Owner' && (
          <Grid item size={{ xs: 12 }}>
            <Paper elevation={3} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                 <SettingsBackupRestoreIcon color="action" sx={{ mr: 1 }} />
                 <Typography variant="h6" component="h3">Automated Backup Settings</Typography>
              </Box>
              <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                  {isBackupLoading ? (
                     <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress size={24} /></Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
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
                                Enable Daily Automated Backups to Google Cloud Storage
                                {isBackupSaving && <CircularProgress size={16} sx={{ ml: 1 }} />}
                            </Box>
                        }
                        sx={{ mr: 2, mb: { xs: 2, sm: 0 }, width: '100%' }}
                      />
                      {/* --- MODIFIED TextField --- */}
                      <TextField
                        label="Scheduled Backup Time (Manila Time)"
                        type="time" // Changed
                        fullWidth
                        value={backupSettings.time} // Changed
                        onChange={handleBackupTimeChange} // Changed
                        onBlur={handleBackupTimeBlur} // Changed
                        name="timeInput"
                        disabled={!backupSettings.enabled || isBackupLoading || isBackupSaving}
                        helperText="Saves automatically when you click away." // Changed
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ step: 300 }} // Added
                        // --- REMOVED: error, placeholder, InputProps ---
                        sx={{ 
                          mt: { xs: 2, sm: 2 }, 
                          width: '100%' , 
                          minWidth: '220px' // Kept minWidth for alignment
                        }} 
                      />
                    </Box>
                  )}
              </Box>
              <Box sx={{ mt: 'auto', pt: 2, flexShrink: 0, height: '40px' }}>
                 {/* This box is empty but maintains the card's minimum height */}
              </Box>
            </Paper>
          </Grid>
        )}
        {/* --- END MODIFICATION --- */}


        {/* Manual Backup & Restore Section (unchanged) */}
        {user?.role === 'Owner' && (
          <Grid item size={{ xs: 12 }}>
             {/* ... unchanged GCS Backup/Restore JSX ... */}
             <Paper elevation={3} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
               <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                 <SecurityIcon color="action" sx={{ mr: 1 }} />
                 <Typography variant="h6" component="h3">Manual Backup & Restore (GCS)</Typography>
              </Box>
              <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  {/* Backup to GCS Button Section */}
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Manually trigger a database backup to Google Cloud Storage. The backup file (.gz) can be used for restoring later.
                    </Typography>
                    <Button
                      variant="contained" color="info"
                      startIcon={isBackingUpToGCS ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
                      onClick={handleTriggerBackupToGCS}
                      disabled={isBackingUpToGCS || isRestoring}
                      sx={{mb: 2}}
                    >
                      {isBackingUpToGCS ? 'Backing Up...' : 'Backup Now to GCS'}
                    </Button>
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  {/* Restore Section */}
                  <Box>
                    <Typography variant="body2" color="error" gutterBottom sx={{ fontWeight: 'bold' }}>
                      <WarningAmberIcon sx={{ fontSize: '1rem', verticalAlign: 'middle', mr: 0.5 }} />
                      WARNING: Restoring will overwrite ALL current data. Choose a backup file from Google Cloud Storage.
                    </Typography>

                    {/* Select Dropdown for GCS Backups */}
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

                    {/* Restore Button */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      <Button
                        variant="contained" color="error"
                        startIcon={isRestoring ? <CircularProgress size={20} color="inherit" /> : <RestoreIcon />}
                        onClick={handleRestoreSubmit}
                        disabled={!selectedRestoreFile || isRestoring || isLoadingBackups || isBackingUpToGCS}
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

      {/* Dialogs remain unchanged */}
      {/* Update Profile Dialog */}
      <Dialog open={showUpdateModal} onClose={closeUpdateModal} fullWidth maxWidth="sm">
        {/* ... unchanged ... */}
         <DialogTitle>{requiresVerification ? 'Enter Verification Code' : 'Update My Profile'}</DialogTitle>
        {requiresVerification ? (
          <Box component="form" onSubmit={handleVerificationSubmit}>
            <DialogContent>
              <DialogContentText sx={{ mb: 1 }}>{updateMessage}</DialogContentText>
              <Typography align="center" variant="h5" sx={{ my: 2, color: timer <= 30 ? 'error.main' : 'inherit' }}>{formatTime(timer)}</Typography>
              <TextField autoFocus required fullWidth label="Verification Code" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} InputLabelProps={{ shrink: true }} />
              {updateError && <Alert severity="error" sx={{ mt: 2 }}>{updateError}</Alert>}
            </DialogContent>
            <DialogActions>
              <Button onClick={closeUpdateModal}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={isBackupSaving}>
                 {isBackupSaving ? <CircularProgress size={24} color="inherit"/> : 'Verify & Save'}
              </Button>
            </DialogActions>
          </Box>
        ) : (
          <Box component="form" onSubmit={openConfirmModal}>
            <DialogContent>
              <TextField margin="dense" name="fullName" label="Full Name" type="text" fullWidth variant="outlined" defaultValue={profile.fullName} onChange={e => setUpdateFormData(p => ({...p, fullName: e.target.value}))}/>
              <TextField margin="dense" name="username" label="Username" type="text" fullWidth variant="outlined" defaultValue={profile.username} onChange={e => setUpdateFormData(p => ({...p, username: e.target.value}))}/>
              <TextField margin="dense" name="email" label="Email" type="email" fullWidth variant="outlined" defaultValue={profile.email} onChange={e => setUpdateFormData(p => ({...p, email: e.target.value}))}/>
              <Divider sx={{ my: 2 }}><Typography variant="overline">Change Password (Optional)</Typography></Divider>
              <TextField margin="dense" name="oldPassword" label="Old Password" type="password" fullWidth variant="outlined" onChange={e => setUpdateFormData(p => ({...p, oldPassword: e.target.value}))}/>
              <TextField margin="dense" name="newPassword" label="New Password" type="password" fullWidth variant="outlined" onChange={e => setUpdateFormData(p => ({...p, newPassword: e.target.value}))}/>
              <TextField margin="dense" name="confirmPassword" label="Confirm New Password" type="password" fullWidth variant="outlined" onChange={e => setUpdateFormData(p => ({...p, confirmPassword: e.target.value}))}/>
              {updateError && <Alert severity="error" sx={{ mt: 2 }}>{updateError}</Alert>}
            </DialogContent>
            <DialogActions>
              <Button onClick={closeUpdateModal}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={isBackupSaving}>
                {isBackupSaving ? <CircularProgress size={24} color="inherit"/> : 'Review Changes'}
              </Button>
            </DialogActions>
          </Box>
        )}
      </Dialog>
      {/* Confirm Changes Dialog */}
      <Dialog open={showConfirmModal} onClose={() => setShowConfirmModal(false)}>
        {/* ... unchanged ... */}
        <DialogTitle>Confirm Profile Update</DialogTitle>
        <DialogContent>
          <DialogContentText>Please review the changes:</DialogContentText>
          <List dense>
            {changesSummary.map((change, index) => (
              <ListItem key={index}>
                 <ListItemText primary={change.field} secondary={`"${change.oldValue}"  →  "${change.newValue}"`} />
              </ListItem>
            ))}
          </List>
          {updateError && <Alert severity="error">{updateError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmModal(false)}>Cancel</Button>
          <Button onClick={confirmProfileUpdate} autoFocus disabled={isBackupSaving}>
            {isBackupSaving ? <CircularProgress size={24} color="inherit"/> : 'Confirm & Submit'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Success Dialog */}
      <Dialog open={showSuccessModal} onClose={handleCloseSuccessModal}>
        {/* ... unchanged ... */}
        <DialogContent sx={{ textAlign: 'center', p: 4 }}>
          <CheckCircleOutlineIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h5" gutterBottom>Success!</Typography>
          <DialogContentText>{updateMessage}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button onClick={handleCloseSuccessModal} variant="contained">OK</Button>
        </DialogActions>
      </Dialog>
      {/* Restore Confirmation Dialog */}
      <Dialog open={showRestoreConfirm} onClose={() => !isRestoring && setShowRestoreConfirm(false)} >
        {/* ... unchanged ... */}
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