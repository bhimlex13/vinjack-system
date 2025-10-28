// client/src/pages/SettingsPage.js
import React, { useState, useEffect, useContext, useRef } from 'react';
import api from '../api/axios';
import AuthContext from '../context/AuthContext';
import { requestProfileUpdate, verifyOwnerUpdate } from '../api/userApi';
// --- MODIFIED: Import new/updated backup/restore API functions ---
import { triggerManualBackupToGCS, restoreBackup, listGCSBackups } from '../api/settingsApi'; // Ensure correct imports
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
  InputAdornment,
  // --- NEW: Import Select and MenuItem for backup list ---
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  IconButton // Keep if needed for other parts, e.g., profile update
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SaveIcon from '@mui/icons-material/Save';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
// --- MODIFIED: Icons for GCS backup/restore ---
import CloudUploadIcon from '@mui/icons-material/CloudUpload'; // Backup to GCS
import RestoreIcon from '@mui/icons-material/Restore'; // Restore icon
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
// --- END MODIFICATIONS ---

// --- Time Conversion Helpers ---
const formatTo12Hour = (time24) => {
  if (!time24 || !/^\d{2}:\d{2}$/.test(time24)) { return ''; }
  try {
      const [hours, minutes] = time24.split(':');
      const h = parseInt(hours, 10);
      const suffix = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      return `${String(hour12).padStart(2, '0')}:${minutes} ${suffix}`;
  } catch (e) { console.error("Error formatting time to 12h:", e); return ''; }
};

const formatTo24Hour = (time12) => {
  if (!time12) return null;
  const match = time12.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let [, hours, minutes, suffix] = match;
  let h = parseInt(hours, 10);
  suffix = suffix.toUpperCase();
  if (isNaN(h) || h < 1 || h > 12 || isNaN(parseInt(minutes, 10)) || parseInt(minutes, 10) > 59) { return null; }
  if (suffix === 'AM' && h === 12) h = 0; else if (suffix === 'PM' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
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

  // Automated Backup Settings State
  const [backupSettings, setBackupSettings] = useState({ enabled: false, time: '02:00' });
  const [backupTimeInput, setBackupTimeInput] = useState('');
  const [backupTimeError, setBackupTimeError] = useState('');
  const [isBackupLoading, setIsBackupLoading] = useState(false); // For loading initial config
  const [isBackupSaving, setIsBackupSaving] = useState(false); // For saving config

  // --- MODIFIED: GCS Backup & Restore State ---
  const [isBackingUpToGCS, setIsBackingUpToGCS] = useState(false); // Renamed state
  const [isRestoring, setIsRestoring] = useState(false);
  const [gcsBackups, setGcsBackups] = useState([]); // List of backups from GCS
  const [selectedRestoreFile, setSelectedRestoreFile] = useState(''); // Selected filename for restore
  const [isLoadingBackups, setIsLoadingBackups] = useState(false); // Loading state for backup list
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  // --- END MODIFICATIONS ---


  // Fetch initial data (Profile, Personal Settings, Backup Config)
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

  // Check for restore flag on mount
  useEffect(() => {
    const restoreFlag = localStorage.getItem('restoreCompleted');
    if (restoreFlag) {
        toast.success("Database restore completed successfully. Please log in again.", { autoClose: 7000 });
        localStorage.removeItem('restoreCompleted');
    }
  }, []);

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

  // Fetch GCS Backup List on Mount (Owner only)
  useEffect(() => {
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

  // Save personal notification settings
  const handleSavePersonalSettings = async (e) => {
      e.preventDefault();
      try {
          if (!/^\d{2}:\d{2}$/.test(personalSettings.notificationTime)) {
              toast.error('Invalid notification time format. Use HH:MM.'); return;
          }
          await api.put('/settings', personalSettings);
          toast.success('Notification settings saved!');
      }
      catch (err){ toast.error(err.response?.data?.message || 'Failed to save notification settings.'); console.error(err); }
  };

  // Handle Automated Backup Settings Change
  const handleBackupSettingChange = (event) => {
    const { name, value, checked } = event.target;
    if (name === 'enabled') {
      setBackupSettings(prev => ({ ...prev, enabled: checked })); if (!checked) setBackupTimeError('');
    } else if (name === 'timeInput') {
      setBackupTimeInput(value);
      if (backupSettings.enabled || value.trim()) {
        const time24 = formatTo24Hour(value);
        if (!time24) setBackupTimeError('Invalid format. Use hh:mm AM/PM (e.g., 02:00 AM)'); else setBackupTimeError('');
      } else { setBackupTimeError(''); }
    }
  };

  // Save Automated Backup Settings
  const handleSaveBackupSettings = async (e) => {
    e.preventDefault();
    let time24 = backupSettings.time;
    if (backupSettings.enabled) {
        time24 = formatTo24Hour(backupTimeInput);
        if (!time24) { setBackupTimeError('Invalid time format. Please correct it before saving.'); toast.error('Invalid backup time format.'); return; }
    }
    setBackupTimeError('');
    const settingsToSave = { enabled: backupSettings.enabled, time: time24 };
    setIsBackupSaving(true);
    try {
      await api.put('/settings/backup/config', settingsToSave);
      setBackupSettings(settingsToSave); setBackupTimeInput(formatTo12Hour(settingsToSave.time)); toast.success('Automated backup settings saved!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save backup settings.'); console.error(err);
    } finally { setIsBackupSaving(false); }
  };

  // --- MODIFIED: GCS Backup & Restore Logic ---

  // Handle Trigger Manual Backup to GCS
  const handleTriggerBackupToGCS = async () => {
    setIsBackingUpToGCS(true);
    toast.info('Starting manual backup to Google Cloud Storage...');
    try {
      const response = await triggerManualBackupToGCS(); // Calls POST endpoint
      toast.success(response.message || 'Manual backup to GCS completed!');
      // Refresh the backup list after a successful backup
      const backups = await listGCSBackups();
      setGcsBackups(backups);
    } catch (err) {
      console.error('Manual backup to GCS error:', err);
      toast.error(err.response?.data?.message || 'Failed to trigger manual backup to GCS.');
    } finally {
      setIsBackingUpToGCS(false);
    }
  };

  // Handle Restore File Selection (from dropdown)
  const handleRestoreFileSelectChange = (event) => {
    setSelectedRestoreFile(event.target.value); // Store the selected filename
  };

  // Handle Restore Submit (opens confirmation)
  const handleRestoreSubmit = () => {
    if (!selectedRestoreFile) { // Check if a file is selected from the list
      toast.error('Please select a backup file from the list to restore.');
      return;
    }
    setShowRestoreConfirm(true); // Open confirmation dialog
  };

  // Handle Restore Confirmation
  const confirmRestore = async () => {
    if (!selectedRestoreFile) return;

    setShowRestoreConfirm(false);
    setIsRestoring(true);
    toast.info('Restoring database from GCS... Please do not close this page. You will be logged out upon completion.', { autoClose: false });

    try {
      // Call the restore API function with the selected filename
      const response = await restoreBackup(selectedRestoreFile); // Pass filename as JSON body

      toast.dismiss(); // Dismiss the "restoring..." message
      toast.success(response.message || 'Restore successful! Logging out...');
      setSelectedRestoreFile(''); // Clear the selected file state

      localStorage.setItem('restoreCompleted', 'true'); // Set flag

      // Logout after a short delay
      setTimeout(() => {
        logout();
      }, 3000);

    } catch (err) {
      toast.dismiss(); // Dismiss the "restoring..." message
      console.error('Restore error:', err);
      toast.error(err.response?.data?.message || 'Failed to restore database from GCS.');
      setIsRestoring(false); // Only set loading false on error
    }
  };
  // --- END MODIFIED GCS Backup & Restore Logic ---


  // Profile Update Modal Logic
  const openUpdateModal = () => { /* ... unchanged ... */ };
  const closeUpdateModal = () => { /* ... unchanged ... */ };
  const openConfirmModal = (e) => { /* ... unchanged ... */ };
  const confirmProfileUpdate = async () => { /* ... unchanged ... */ };
  const handleVerificationSubmit = async (e) => { /* ... unchanged ... */ };
  const handleCloseSuccessModal = () => { /* ... unchanged ... */ };


  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>My Settings</Typography>

      <Grid container spacing={4}>
        {/* Profile Section */}
        <Grid item size={{ xs: 12}}>
            <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom component="div" sx={{ flexShrink: 0 }}>My Profile</Typography>
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

        {/* Notification Settings Section */}
        <Grid item size={{ xs: 12}}>
            <Paper component="form" onSubmit={handleSavePersonalSettings} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom component="div" sx={{ flexShrink: 0 }}>Notification Settings</Typography>
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
                        inputProps={{ step: 300 }} // 5 minute steps
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
          <Grid item size={{ xs: 12}}>
            <Paper component="form" onSubmit={handleSaveBackupSettings} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom component="div" sx={{ flexShrink: 0 }}>Automated Backup Settings</Typography>
              <Divider sx={{ mb: 2, flexShrink: 0 }} />
              <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                  {isBackupLoading ? (
                     <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress size={24} /></Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                      <FormControlLabel
                        control={<Switch checked={backupSettings.enabled} onChange={handleBackupSettingChange} name="enabled" />}
                        label="Enable Daily Automated Backups to Google Cloud Storage"
                        sx={{ mr: 2, mb: { xs: 2, sm: 0 }, width: '100%' }}
                      />
                      <TextField
                        label="Scheduled Backup Time (Manila Time)" type="text" placeholder="e.g., 02:00 AM or 11:30 PM"
                        value={backupTimeInput} onChange={handleBackupSettingChange} name="timeInput"
                        disabled={!backupSettings.enabled} error={!!backupTimeError} helperText={backupTimeError || "Use hh:mm AM/PM format."}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{ startAdornment: (<InputAdornment position="start"><AccessTimeIcon color={!backupSettings.enabled ? 'disabled' : 'action'} /></InputAdornment>), }}
                        sx={{ mt: { xs: 2, sm: 2 }, width: { xs: '100%', sm: 'auto' }, minWidth: '220px' }}
                      />
                    </Box>
                  )}
              </Box>
              <Box sx={{ mt: 'auto', pt: 2, flexShrink: 0 }}>
                 {!isBackupLoading && (
                    <Button type="submit" variant="contained" color="secondary"
                      startIcon={isBackupSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                      disabled={isBackupSaving || isBackupLoading || (backupSettings.enabled && !!backupTimeError)}>
                      {isBackupSaving ? 'Saving...' : 'Save Backup Schedule'}
                    </Button>
                 )}
              </Box>
            </Paper>
          </Grid>
        )}

        {/* --- MODIFIED: Manual Backup & Restore Section (Owner Only) --- */}
        {user?.role === 'Owner' && (
          <Grid item size={{ xs: 12}}>
            <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom component="div" sx={{ flexShrink: 0 }}>Manual Backup & Restore (GCS)</Typography>
              <Divider sx={{ mb: 2, flexShrink: 0 }} />
              <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

                  {/* Backup to GCS Button Section */}
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Manually trigger a database backup to Google Cloud Storage. The backup file (.gz) can be used for restoring later.
                    </Typography>
                    <Button
                      variant="contained"
                      color="info"
                      startIcon={isBackingUpToGCS ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
                      onClick={handleTriggerBackupToGCS}
                      disabled={isBackingUpToGCS || isRestoring} // Disable during either operation
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
                            labelId="gcs-backup-select-label"
                            id="gcs-backup-select"
                            value={selectedRestoreFile}
                            label="Select Backup to Restore from GCS"
                            onChange={handleRestoreFileSelectChange}
                        >
                            <MenuItem value="" disabled sx={{ fontStyle: 'italic' }}>
                                {isLoadingBackups ? 'Loading backups...' : (gcsBackups.length === 0 ? 'No backups found in GCS' : 'Select a backup file...')}
                            </MenuItem>
                            {/* Display backups in the dropdown */}
                            {gcsBackups.map((backup) => (
                                <MenuItem key={backup.name} value={backup.name}>
                                    {/* Display filename, date/time, and size */}
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
                        variant="contained"
                        color="error"
                        startIcon={isRestoring ? <CircularProgress size={20} color="inherit" /> : <RestoreIcon />}
                        onClick={handleRestoreSubmit} // Opens confirmation dialog
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
        {/* --- END MODIFIED SECTION --- */}
      </Grid>

      {/* Update Profile Dialog (unchanged) */}
      <Dialog open={showUpdateModal} onClose={closeUpdateModal} /* ...props... */ >
         {/* ...dialog content... */}
      </Dialog>

      {/* Confirm Changes Dialog (unchanged) */}
      <Dialog open={showConfirmModal} onClose={() => setShowConfirmModal(false)} /* ...props... */ >
         {/* ...dialog content... */}
      </Dialog>

      {/* Success Dialog (unchanged) */}
      <Dialog open={showSuccessModal} onClose={handleCloseSuccessModal} /* ...props... */ >
        {/* ...dialog content... */}
      </Dialog>

      {/* --- MODIFIED: Restore Confirmation Dialog --- */}
      <Dialog
        open={showRestoreConfirm}
        onClose={() => !isRestoring && setShowRestoreConfirm(false)}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <WarningAmberIcon color="error" sx={{ mr: 1 }} />
          Confirm Database Restore from GCS
        </DialogTitle>
        <DialogContent>
          <DialogContentText gutterBottom>
            You are about to restore the database from the Google Cloud Storage file:
          </DialogContentText>
          <Typography variant="body2" sx={{ fontWeight: 'bold', my: 1, wordBreak: 'break-all' }}>
            {selectedRestoreFile || 'N/A'} {/* Show selected filename */}
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
      {/* --- END MODIFICATION --- */}

    </Container>
  );
};

export default SettingsPage;