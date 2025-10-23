// client/src/pages/SettingsPage.js
import React, { useState, useEffect, useContext, useRef } from 'react';
import api from '../api/axios';
import AuthContext from '../context/AuthContext';
import { requestProfileUpdate, verifyOwnerUpdate } from '../api/userApi';
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
  InputAdornment // **Imported InputAdornment**
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SaveIcon from '@mui/icons-material/Save';
import AccessTimeIcon from '@mui/icons-material/AccessTime'; // **Imported AccessTimeIcon**

// --- Time Conversion Helpers ---
// Converts "HH:MM" (24h) to "hh:mm AM/PM" (12h)
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

// Converts "hh:mm AM/PM" (12h) to "HH:MM" (24h)
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
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState({ fullName: '', username: '', email: '' });
  const [originalProfile, setOriginalProfile] = useState({});
  const [personalSettings, setPersonalSettings] = useState({ notificationsEnabled: true, notificationTime: '08:00' });
  // Removed message state, using toast instead
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

  // State for Backup Settings
  const [backupSettings, setBackupSettings] = useState({ enabled: false, time: '02:00' });
  // **State for 12-hour backup time input**
  const [backupTimeInput, setBackupTimeInput] = useState('');
  const [backupTimeError, setBackupTimeError] = useState('');
  // **End Backup time state**
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isBackupSaving, setIsBackupSaving] = useState(false);


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
             fullName: responses[1].data.fullName || '', // Add fallbacks
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
           setBackupTimeInput(formatTo12Hour(responses[2].data.time)); // Initialize 12h input
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
         setUpdateError("Time has expired. Please request a new code."); // Modified message
         // Consider automatically closing or allowing retry
       }
     }
     return () => clearInterval(timerId.current);
   }, [requiresVerification, timer]);

   const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;


  // Save personal notification settings
  const handleSavePersonalSettings = async (e) => {
      e.preventDefault();
      try {
          // Basic validation for notification time
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
    const { name, value, checked, type } = event.target;
    if (name === 'enabled') {
      setBackupSettings(prev => ({ ...prev, enabled: checked }));
      // If disabling, clear time error
      if (!checked) setBackupTimeError('');
    } else if (name === 'timeInput') {
      setBackupTimeInput(value);
      // Validate only if enabled or has value
      if (backupSettings.enabled || value.trim()) {
        const time24 = formatTo24Hour(value);
        if (!time24) {
          setBackupTimeError('Invalid format. Use hh:mm AM/PM (e.g., 02:00 AM)');
        } else {
          setBackupTimeError(''); // Clear error if valid
        }
      } else {
          setBackupTimeError(''); // Clear error if disabled and empty
      }
    }
  };


  // Save Backup Settings
  const handleSaveBackupSettings = async (e) => {
    e.preventDefault();
    let time24 = backupSettings.time; // Default to existing time

    // Re-validate and convert only if enabled
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
        time: time24 // Save the 24-hour format
    };

    setIsBackupSaving(true);
    try {
      await api.put('/settings/backup/config', settingsToSave);
      setBackupSettings(settingsToSave); // Update main state with saved 24h time
      setBackupTimeInput(formatTo12Hour(settingsToSave.time)); // Reformat input display
      toast.success('Automated backup settings saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save backup settings.');
      console.error(err);
    } finally {
      setIsBackupSaving(false);
    }
  };


  // Profile Update Modal Logic
  const openUpdateModal = () => {
    setUpdateFormData({
      fullName: profile.fullName, username: profile.username, email: profile.email,
      oldPassword: '', newPassword: '', confirmPassword: ''
    });
    setUpdateError(''); // Clear previous errors
    setShowUpdateModal(true);
  };
  const closeUpdateModal = () => {
    setShowUpdateModal(false);
    setUpdateError('');
    setUpdateMessage('');
    setRequiresVerification(false);
    setVerificationCode('');
    setTimer(180); // Reset timer
    clearInterval(timerId.current);
  };
  const openConfirmModal = (e) => {
    e.preventDefault();
    setUpdateError(''); // Clear previous errors
    const changes = [];
    if (updateFormData.fullName && updateFormData.fullName !== originalProfile.fullName) changes.push({ field: 'Full Name', oldValue: originalProfile.fullName, newValue: updateFormData.fullName });
    if (updateFormData.username && updateFormData.username !== originalProfile.username) changes.push({ field: 'Username', oldValue: originalProfile.username, newValue: updateFormData.username });
    if (updateFormData.email && updateFormData.email !== originalProfile.email) changes.push({ field: 'Email', oldValue: originalProfile.email, newValue: updateFormData.email });
    if (updateFormData.newPassword) {
      if (!updateFormData.oldPassword) { setUpdateError('Old password is required to change password.'); return; }
      if (updateFormData.newPassword !== updateFormData.confirmPassword) { setUpdateError('New passwords do not match.'); return; }
      if (updateFormData.newPassword.length < 6) { setUpdateError('New password must be at least 6 characters long.'); return; } // Example validation
      changes.push({ field: 'Password', oldValue: '********', newValue: '********' });
    }
    if (changes.length === 0) { setUpdateError('No changes detected to submit.'); return; }
    setChangesSummary(changes);
    setShowConfirmModal(true);
  };
  const confirmProfileUpdate = async () => {
    setUpdateError(''); setUpdateMessage('');
    setIsBackupSaving(true); // Reuse saving state for visual feedback
    try {
      const response = await requestProfileUpdate(updateFormData);
      setShowConfirmModal(false);
      if (response.data.requiresVerification) {
        setRequiresVerification(true);
        setUpdateMessage(response.data.message);
        setTimer(180); // Start timer
      } else {
        setUpdateMessage(response.data.message);
        // Only update pending state visually if NOT owner (owner updates instantly after verify)
        if (user.role !== 'Owner') {
            setPendingChanges({ /* Store relevant pending changes if needed */ });
        }
        setShowSuccessModal(true);
        // Delay closing form modal until success modal is closed for better UX
        // setShowUpdateModal(false);
      }
    } catch (err) {
      setUpdateError(err.response?.data?.message || 'Failed to request profile update.');
      // Keep confirm modal open on error? Let's close it.
      setShowConfirmModal(false);
    } finally {
        setIsBackupSaving(false);
    }
  };
  const handleVerificationSubmit = async (e) => {
    e.preventDefault(); setUpdateError('');
    setIsBackupSaving(true); // Reuse saving state
    try {
      const response = await verifyOwnerUpdate(verificationCode);
      setUpdateMessage(response.data.message);
      // Update local profile state immediately on success
      const updatedProfile = {
          fullName: updateFormData.fullName || profile.fullName, // Use existing if not changed
          username: updateFormData.username || profile.username,
          email: updateFormData.email || profile.email
      };
      setProfile(updatedProfile);
      setOriginalProfile(updatedProfile); // Update original profile too
      setPendingChanges(null); // Clear pending state
      setShowSuccessModal(true); // Show success message
      // Delay closing form modal until success modal is closed
      // setShowUpdateModal(false);
    } catch (err) {
      setUpdateError(err.response?.data?.message || 'Verification failed.');
    } finally {
        setIsBackupSaving(false);
    }
   };

   // Close main modal when success modal is closed
   const handleCloseSuccessModal = () => {
       setShowSuccessModal(false);
       closeUpdateModal(); // Now close the main form/verification modal
   }


  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>My Settings</Typography>

      <Grid container spacing={4}>
        {/* Profile Section */}
        <Grid item size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>My Profile</Typography>
                {pendingChanges && user.role !== 'Owner' && <Alert severity="info" sx={{ mb: 2 }}>You have pending profile changes awaiting owner approval.</Alert>}
                <List dense>
                  <ListItem><ListItemIcon><BadgeIcon /></ListItemIcon><ListItemText primary="Full Name" secondary={profile.fullName} /></ListItem>
                  <ListItem><ListItemIcon><AccountCircleIcon /></ListItemIcon><ListItemText primary="Username" secondary={profile.username} /></ListItem>
                  <ListItem><ListItemIcon><EmailIcon /></ListItemIcon><ListItemText primary="Email" secondary={profile.email} /></ListItem>
                  <ListItem><ListItemIcon><VpnKeyIcon /></ListItemIcon><ListItemText primary="Password" secondary="********" /></ListItem>
                </List>
                <Button variant="contained" onClick={openUpdateModal} sx={{ mt: 2 }} disabled={!!pendingChanges && user.role !== 'Owner'}>
                    Request Profile Update
                </Button>
            </Paper>
        </Grid>

        {/* Notification Settings Section */}
        <Grid item size={{ xs: 12, md: 6 }}>
            <Paper component="form" onSubmit={handleSavePersonalSettings} sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>Notification Settings</Typography>
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
                    inputProps={{ step: 60*5 }} // 5 min step
                    helperText="Emails will be sent daily around this time if stock is low."
                    sx={{ mt: 2 }}
                />
                <Button type="submit" variant="contained" sx={{ mt: 3 }} startIcon={<SaveIcon />}>
                    Save Notification Settings
                </Button>
            </Paper>
        </Grid>

        {/* Automated Backup Settings Section (Owner Only) */}
        {user?.role === 'Owner' && (
          <Grid item size={{ xs: 12 }}>
            <Paper component="form" onSubmit={handleSaveBackupSettings} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Automated Backup Settings</Typography>
              <Divider sx={{ mb: 2 }} />
              {isBackupLoading ? (
                 <Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}> {/* Use Flexbox */}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={backupSettings.enabled}
                        onChange={handleBackupSettingChange}
                        name="enabled"
                      />
                    }
                    label="Enable Daily Automated Backups to Google Cloud Storage"
                    sx={{ mr: 2, mb: { xs: 2, sm: 0 } }} // Add bottom margin on small screens
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
                    sx={{ mt: { xs: 1, sm: 0 }, width: { xs: '100%', sm: 'auto' }, minWidth: '220px' }} // Adjust width
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    color="secondary"
                    sx={{ mt: { xs: 2, sm: 0 }, ml: { xs: 0, sm: 2 } }}
                    startIcon={isBackupSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    disabled={isBackupSaving || isBackupLoading || (backupSettings.enabled && !!backupTimeError)} // Disable if enabled and error exists
                  >
                    {isBackupSaving ? 'Saving...' : 'Save Backup Schedule'}
                  </Button>
                </Box>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Update Profile Dialog */}
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

      {/* Confirm Changes Dialog */}
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

      {/* Success Dialog */}
      <Dialog open={showSuccessModal} onClose={handleCloseSuccessModal}> {/* Use specific close handler */}
        <DialogContent sx={{ textAlign: 'center', p: 4 }}>
          <CheckCircleOutlineIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h5" gutterBottom>Success!</Typography>
          <DialogContentText>{updateMessage}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button onClick={handleCloseSuccessModal} variant="contained">OK</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SettingsPage;