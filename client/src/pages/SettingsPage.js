// client/src/pages/SettingsPage.js
import React, { useState, useEffect, useContext, useRef } from 'react';
import api from '../api/axios';
import AuthContext from '../context/AuthContext';
import { requestProfileUpdate, verifyOwnerUpdate } from '../api/userApi';
import { createManualBackup, restoreBackup } from '../api/settingsApi';
import { toast } from 'react-toastify'; // Make sure toast is imported

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
  InputAdornment,
  IconButton
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SaveIcon from '@mui/icons-material/Save';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CloseIcon from '@mui/icons-material/Close';

// --- Time Conversion Helpers ---
// (Keep the helper functions as they were)
const formatTo12Hour = (time24) => {
  if (!time24 || !/^\d{2}:\d{2}$/.test(time24)) {
    return ''; // Return empty or default if format is wrong
  }
  try {
      const [hours, minutes] = time24.split(':');
      const h = parseInt(hours, 10);
      const suffix = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 === 0 ? 12 : h % 12; // Convert 0/12 to 12
      return `${String(hour12).padStart(2, '0')}:${minutes} ${suffix}`;
  } catch (e) {
      console.error("Error formatting time to 12h:", e);
      return ''; // Return empty string on error
  }
};

const formatTo24Hour = (time12) => {
  if (!time12) return null;
  const match = time12.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i); // Added trim()
  if (!match) return null; // Invalid format

  let [, hours, minutes, suffix] = match;
  let h = parseInt(hours, 10);
  suffix = suffix.toUpperCase();

  if (isNaN(h) || h < 1 || h > 12 || isNaN(parseInt(minutes, 10)) || parseInt(minutes, 10) > 59) {
      return null; // Invalid time values
  }

  if (suffix === 'AM' && h === 12) { // 12:xx AM is 00:xx
    h = 0;
  } else if (suffix === 'PM' && h !== 12) { // 1:xx PM to 11:xx PM add 12
    h += 12;
  }
  // 12:xx PM remains 12:xx

  return `${String(h).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`; // Pad minutes too
};
// --- END Time Conversion Helpers ---


const SettingsPage = () => {
  const { user, logout } = useContext(AuthContext);
  const [profile, setProfile] = useState({ fullName: '', username: '', email: '' });
  const [originalProfile, setOriginalProfile] = useState({});
  const [personalSettings, setPersonalSettings] = useState({ notificationsEnabled: true, notificationTime: '08:00' });
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

  // Backup Settings State
  const [backupSettings, setBackupSettings] = useState({ enabled: false, time: '02:00' });
  const [backupTimeInput, setBackupTimeInput] = useState('');
  const [backupTimeError, setBackupTimeError] = useState('');
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isBackupSaving, setIsBackupSaving] = useState(false);

  // Manual Backup & Restore State
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);


  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
       if (!user) return;
       setIsBackupLoading(true);
       try {
         const apiCalls = [
           api.get('/settings'),
           api.get('/users/me')
         ];
         if (user.role === 'Owner') {
           apiCalls.push(api.get('/settings/backup/config'));
         }
         const responses = await Promise.all(apiCalls);

         if (responses[0]?.data) setPersonalSettings(responses[0].data);

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

         if (user.role === 'Owner' && responses[2]?.data) {
           setBackupSettings(responses[2].data);
           setBackupTimeInput(formatTo12Hour(responses[2].data.time));
           setBackupTimeError('');
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

  // Timer logic
   useEffect(() => {
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

   const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;


  // Save personal notification settings
  const handleSavePersonalSettings = async (e) => {
      e.preventDefault();
      try {
          if (!/^\d{2}:\d{2}$/.test(personalSettings.notificationTime)) {
              toast.error('Invalid notification time format. Use HH:MM.');
              return;
          }
          await api.put('/settings', personalSettings);
          toast.success('Notification settings saved!');
      }
      catch (err){
          toast.error(err.response?.data?.message || 'Failed to save notification settings.');
          console.error(err);
      }
  };

  // Handle Backup Settings Change
  const handleBackupSettingChange = (event) => {
    const { name, value, checked } = event.target;
    if (name === 'enabled') {
      setBackupSettings(prev => ({ ...prev, enabled: checked }));
      if (!checked) setBackupTimeError('');
    } else if (name === 'timeInput') {
      setBackupTimeInput(value);
      if (backupSettings.enabled || value.trim()) {
        const time24 = formatTo24Hour(value);
        if (!time24) {
          setBackupTimeError('Invalid format. Use hh:mm AM/PM (e.g., 02:00 AM)');
        } else {
          setBackupTimeError('');
        }
      } else {
          setBackupTimeError('');
      }
    }
  };


  // Save Backup Settings
  const handleSaveBackupSettings = async (e) => {
    e.preventDefault();
    let time24 = backupSettings.time;

    if (backupSettings.enabled) {
        time24 = formatTo24Hour(backupTimeInput);
        if (!time24) {
          setBackupTimeError('Invalid time format. Please correct it before saving.');
          toast.error('Invalid backup time format.');
          return;
        }
    }
    setBackupTimeError('');

    const settingsToSave = {
        enabled: backupSettings.enabled,
        time: time24
    };

    setIsBackupSaving(true);
    try {
      await api.put('/settings/backup/config', settingsToSave);
      setBackupSettings(settingsToSave);
      setBackupTimeInput(formatTo12Hour(settingsToSave.time));
      toast.success('Automated backup settings saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save backup settings.');
      console.error(err);
    } finally {
      setIsBackupSaving(false);
    }
  };

  // --- Manual Backup & Restore Logic ---

  // Handle Download Manual Backup
  const handleDownloadManualBackup = async () => {
    setIsDownloading(true);
    toast.info('Generating manual backup... This may take a moment.');
    try {
      const response = await createManualBackup();

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || `Failed to download backup (Status: ${response.status})`);
      }

      const disposition = response.headers.get('content-disposition');
      let fileName = 'vinjack-manual-backup.json';
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          fileName = matches[1].replace(/['"]/g, '');
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Manual backup downloaded successfully!');
    } catch (err) {
      console.error('Manual backup download error:', err);
      toast.error(err.message || 'Failed to download manual backup.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle Restore File Selection
  const handleRestoreFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.name.endsWith('.gz')) {
        setRestoreFile(file);
      } else {
        toast.error('Invalid file type. Please select a .gz file.');
        setRestoreFile(null);
        event.target.value = null;
      }
    } else {
      setRestoreFile(null);
    }
  };

  // Handle Restore Submit (opens confirmation)
  const handleRestoreSubmit = () => {
    if (!restoreFile) {
      toast.error('Please select a .gz backup file to restore.');
      return;
    }
    setShowRestoreConfirm(true);
  };

  // Handle Restore Confirmation
  const confirmRestore = async () => {
    if (!restoreFile) return;

    setShowRestoreConfirm(false);
    setIsRestoring(true);
    toast.info('Restoring database... Please do not close this page.');

    const formData = new FormData();
    formData.append('backupFile', restoreFile);

    try {
      const response = await restoreBackup(formData);

      toast.success(response.message || 'Restore successful! Logging out...');
      setRestoreFile(null);
      const fileInput = document.getElementById('restore-file-input');
      if (fileInput) fileInput.value = null;

      // --- SET FLAG BEFORE LOGOUT ---
      localStorage.setItem('restoreCompleted', 'true');
      // --- END SET FLAG ---

      setTimeout(() => {
        logout();
      }, 3000);

    } catch (err) {
      console.error('Restore error:', err);
      toast.error(err.response?.data?.message || 'Failed to restore database.');
      setIsRestoring(false);
    }
  };
  // --- END Manual Backup & Restore Logic ---


  // Profile Update Modal Logic
  const openUpdateModal = () => {
    setUpdateFormData({
      fullName: profile.fullName, username: profile.username, email: profile.email,
      oldPassword: '', newPassword: '', confirmPassword: ''
    });
    setUpdateError('');
    setShowUpdateModal(true);
  };
  const closeUpdateModal = () => {
    setShowUpdateModal(false);
    setUpdateError('');
    setUpdateMessage('');
    setRequiresVerification(false);
    setVerificationCode('');
    setTimer(180);
    clearInterval(timerId.current);
  };
  const openConfirmModal = (e) => {
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
  const confirmProfileUpdate = async () => {
    setUpdateError(''); setUpdateMessage('');
    setIsBackupSaving(true);
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
  const handleVerificationSubmit = async (e) => {
    e.preventDefault(); setUpdateError('');
    setIsBackupSaving(true);
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
   const handleCloseSuccessModal = () => {
       setShowSuccessModal(false);
       closeUpdateModal();
   }


  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>My Settings</Typography>

      <Grid container spacing={4}>
        {/* Profile Section */}
        <Grid item size={{ xs: 12, md: 6 }} sx={{ height: '420px' }}>
            <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                    <Typography variant="h6" gutterBottom component="div" sx={{ flexGrow: 1, mb: 0 }}>My Profile</Typography>
                </Box>
                {pendingChanges && user.role !== 'Owner' && <Alert severity="info" sx={{ mb: 2 }}>You have pending profile changes awaiting owner approval.</Alert>}
                <List dense sx={{ flexGrow: 1, overflowY: 'auto' }}>
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

        {/* Notification Settings Section */}
        <Grid item size={{ xs: 12, md: 6 }} sx={{ height: '420px' }}>
            <Paper component="form" onSubmit={handleSavePersonalSettings} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                    <Typography variant="h6" gutterBottom component="div" sx={{ flexGrow: 1, mb: 0 }}>Notification Settings</Typography>
                </Box>
                <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                    <FormControlLabel
                      control={<Switch checked={personalSettings.notificationsEnabled} onChange={(e) => setPersonalSettings(p => ({ ...p, notificationsEnabled: e.target.checked }))} name="notificationsEnabled" />}
                      label="Enable Low Stock Email Alerts"
                    />
                    <TextField
                        label="Notification Time (Manila Time)"
                        type="time"
                        fullWidth
                        value={personalSettings.notificationTime}
                        onChange={(e) => setPersonalSettings(p => ({ ...p, notificationTime: e.target.value }))}
                        disabled={!personalSettings.notificationsEnabled}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ step: 60*5 }}
                        helperText="Emails will be sent daily around this time if stock is low."
                        sx={{ mt: 2 }}
                    />
                </Box>
                <Box sx={{ mt: 'auto', pt: 2, flexShrink: 0 }}>
                    <Button type="submit" variant="contained" startIcon={<SaveIcon />}>
                        Save Notification Settings
                    </Button>
                </Box>
            </Paper>
        </Grid>

        {/* Automated Backup Settings Section (Owner Only) */}
        {user?.role === 'Owner' && (
          <Grid item size={{ xs: 12, md: 6 }} sx={{ height: '420px' }}>
            <Paper component="form" onSubmit={handleSaveBackupSettings} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                  <Typography variant="h6" gutterBottom component="div" sx={{ flexGrow: 1, mb: 0 }}>Automated Backup Settings</Typography>
              </Box>
              <Divider sx={{ mb: 2, flexShrink: 0 }} />
              <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                  {isBackupLoading ? (
                     <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress size={24} /></Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={backupSettings.enabled}
                            onChange={handleBackupSettingChange}
                            name="enabled"
                          />
                        }
                        label="Enable Daily Automated Backups to Google Cloud Storage"
                        sx={{ mr: 2, mb: { xs: 2, sm: 0 }, width: '100%' }}
                      />
                      <TextField
                        label="Scheduled Backup Time (Manila Time)"
                        type="text"
                        placeholder="e.g., 02:00 AM or 11:30 PM"
                        value={backupTimeInput}
                        onChange={handleBackupSettingChange}
                        name="timeInput"
                        disabled={!backupSettings.enabled}
                        error={!!backupTimeError}
                        helperText={backupTimeError || "Use hh:mm AM/PM format."}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                  <AccessTimeIcon color={!backupSettings.enabled ? 'disabled' : 'action'} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ mt: { xs: 2, sm: 2 }, width: { xs: '100%', sm: 'auto' }, minWidth: '220px' }}
                      />
                    </Box>
                  )}
              </Box>
              <Box sx={{ mt: 'auto', pt: 2, flexShrink: 0 }}>
                 {!isBackupLoading && (
                    <Button
                      type="submit"
                      variant="contained"
                      color="secondary"
                      startIcon={isBackupSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                      disabled={isBackupSaving || isBackupLoading || (backupSettings.enabled && !!backupTimeError)}
                    >
                      {isBackupSaving ? 'Saving...' : 'Save Backup Schedule'}
                    </Button>
                 )}
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Manual Backup & Restore Section (Owner Only) */}
        {user?.role === 'Owner' && (
          <Grid item size={{ xs: 12, md: 6 }} sx={{ height: '420px' }}>
            <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                  <Typography variant="h6" gutterBottom component="div" sx={{ flexGrow: 1, mb: 0 }}>Manual Backup & Restore</Typography>
              </Box>
              <Divider sx={{ mb: 2, flexShrink: 0 }} />
              <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  {/* Download Button Section */}
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Create and download a full system backup (.json format). This file is for safekeeping and is NOT used for restoring.
                    </Typography>
                    <Button
                      variant="contained"
                      color="info"
                      startIcon={isDownloading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                      onClick={handleDownloadManualBackup}
                      disabled={isDownloading || isRestoring}
                      sx={{mb: 2}}
                    >
                      {isDownloading ? 'Generating...' : 'Download Manual Backup'}
                    </Button>
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  {/* Restore Section */}
                  <Box>
                    <Typography variant="body2" color="error" gutterBottom sx={{ fontWeight: 'bold' }}>
                      WARNING: Restoring will overwrite ALL current data. This action cannot be undone.
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      Upload a compatible backup file (.gz) generated by the automated system.
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 2, flexWrap: 'wrap' }}>
                      <Button
                        variant="outlined"
                        component="label"
                        color="warning"
                        disabled={isRestoring}
                        sx={{ mr: 2, mb: { xs: 1, sm: 0 } }}
                      >
                        Select .gz File
                        <input
                          id="restore-file-input"
                          type="file"
                          hidden
                          accept=".gz"
                          onChange={handleRestoreFileSelect}
                        />
                      </Button>
                      
                      {restoreFile && (
                        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, mb: { xs: 1, sm: 0 }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Typography variant="body2" sx={{ mr: 1, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis' }} title={restoreFile.name}>
                            Selected: {restoreFile.name}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setRestoreFile(null);
                              const fileInput = document.getElementById('restore-file-input');
                              if (fileInput) fileInput.value = null;
                            }}
                            disabled={isRestoring}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}

                      <Button
                        variant="contained"
                        color="error"
                        startIcon={isRestoring ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
                        onClick={handleRestoreSubmit}
                        disabled={!restoreFile || isRestoring || isDownloading}
                        sx={{ ml: { xs: 0, sm: 'auto' } }}
                      >
                        {isRestoring ? 'Restoring...' : 'Restore from File'}
                      </Button>
                    </Box>
                  </Box>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Update Profile Dialog (Keep Dialogs as they were) */}
      <Dialog open={showUpdateModal} onClose={closeUpdateModal} fullWidth maxWidth="sm">
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

      {/* Confirm Changes Dialog (Keep Dialog as it was) */}
      <Dialog open={showConfirmModal} onClose={() => setShowConfirmModal(false)}>
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

      {/* Success Dialog (Keep Dialog as it was) */}
      <Dialog open={showSuccessModal} onClose={handleCloseSuccessModal}>
        <DialogContent sx={{ textAlign: 'center', p: 4 }}>
          <CheckCircleOutlineIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h5" gutterBottom>Success!</Typography>
          <DialogContentText>{updateMessage}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button onClick={handleCloseSuccessModal} variant="contained">OK</Button>
        </DialogActions>
      </Dialog>

      {/* Restore Confirmation Dialog (Keep Dialog as it was) */}
      <Dialog open={showRestoreConfirm} onClose={() => !isRestoring && setShowRestoreConfirm(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <WarningAmberIcon color="error" sx={{ mr: 1 }} />
          Confirm Database Restore
        </DialogTitle>
        <DialogContent>
          <DialogContentText gutterBottom>
            You are about to restore the database from the file:
          </DialogContentText>
          <Typography variant="body2" sx={{ fontWeight: 'bold', my: 1 }}>
            {restoreFile?.name}
          </Typography>
          <DialogContentText color="error" sx={{ fontWeight: 'bold' }}>
            This will permanently DELETE all current data and replace it with the data from this backup. This action CANNOT be undone.
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