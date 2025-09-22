// client/src/pages/SettingsPage.js
import React, { useState, useEffect, useContext, useRef } from 'react';
import api from '../api/axios';
import AuthContext from '../context/AuthContext';
import { requestProfileUpdate, verifyOwnerUpdate } from '../api/userApi';

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
  Divider
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const SettingsPage = () => {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState({ fullName: '', username: '', email: '' });
  const [originalProfile, setOriginalProfile] = useState({});
  const [personalSettings, setPersonalSettings] = useState({ notificationsEnabled: true, notificationTime: '08:00' });
  const [message, setMessage] = useState('');
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

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const [settingsRes, profileRes] = await Promise.all([
          api.get('/settings'),
          api.get('/users/me')
        ]);
        if (settingsRes.data) setPersonalSettings(settingsRes.data);
        if (profileRes.data) {
          const userProfile = {
            fullName: profileRes.data.fullName,
            username: profileRes.data.username,
            email: profileRes.data.email
          };
          setProfile(userProfile);
          setOriginalProfile(userProfile);
          if (profileRes.data.hasPendingChanges) {
            setPendingChanges(profileRes.data.pendingChanges);
          }
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      }
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    if (requiresVerification && timer > 0) {
      timerId.current = setInterval(() => setTimer(prev => prev - 1), 1000);
    } else {
      clearInterval(timerId.current);
      if (timer <= 0 && requiresVerification) {
        setUpdateError("Time has expired. Please try again.");
        setTimeout(() => closeUpdateModal(), 2000);
      }
    }
    return () => clearInterval(timerId.current);
  }, [requiresVerification, timer]);

  const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  const handleSavePersonalSettings = async (e) => {
    e.preventDefault();
    try {
      await api.put('/settings', personalSettings);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Failed to save settings.');
    }
  };

  const openUpdateModal = () => {
    setUpdateFormData({
      fullName: profile.fullName, username: profile.username, email: profile.email,
      oldPassword: '', newPassword: '', confirmPassword: ''
    });
    setShowUpdateModal(true);
  };
  
  const closeUpdateModal = () => {
    setShowUpdateModal(false);
    setUpdateError('');
    setUpdateMessage('');
    setRequiresVerification(false);
    setVerificationCode('');
    clearInterval(timerId.current);
  };

  const openConfirmModal = (e) => {
    e.preventDefault();
    setUpdateError('');
    const changes = [];
    if (updateFormData.fullName !== originalProfile.fullName) changes.push({ field: 'Full Name', oldValue: originalProfile.fullName, newValue: updateFormData.fullName });
    if (updateFormData.username !== originalProfile.username) changes.push({ field: 'Username', oldValue: originalProfile.username, newValue: updateFormData.username });
    if (updateFormData.email !== originalProfile.email) changes.push({ field: 'Email', oldValue: originalProfile.email, newValue: updateFormData.email });
    if (updateFormData.newPassword) {
      if (!updateFormData.oldPassword) { setUpdateError('Old password is required to change password.'); return; }
      if (updateFormData.newPassword !== updateFormData.confirmPassword) { setUpdateError('New passwords do not match.'); return; }
      changes.push({ field: 'Password', oldValue: '********', newValue: '********' });
    }
    if (changes.length === 0) { setUpdateError('No changes to request.'); return; }
    setChangesSummary(changes);
    setShowConfirmModal(true);
  };

  const confirmProfileUpdate = async () => {
    setUpdateError(''); setUpdateMessage('');
    try {
      const response = await requestProfileUpdate(updateFormData);
      setShowConfirmModal(false);
      if (response.data.requiresVerification) {
        setRequiresVerification(true);
        setUpdateMessage(response.data.message);
        setTimer(180); 
      } else {
        setUpdateMessage(response.data.message);
        setPendingChanges(updateFormData);
        setShowSuccessModal(true);
        setShowUpdateModal(false);
      }
    } catch (err) {
      setUpdateError(err.response?.data?.message || 'Failed to request profile update.');
      setShowConfirmModal(false);
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault(); setUpdateError('');
    try {
      const response = await verifyOwnerUpdate(verificationCode);
      setUpdateMessage(response.data.message);
      const updatedProfile = { fullName: updateFormData.fullName, username: updateFormData.username, email: updateFormData.email };
      setProfile(updatedProfile);
      setOriginalProfile(updatedProfile);
      setPendingChanges(null);
      setShowSuccessModal(true);
      setShowUpdateModal(false);
    } catch (err) {
      setUpdateError(err.response?.data?.message || 'Verification failed.');
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>My Settings</Typography>
      {/* --- Grid format updated to match your project's standard --- */}
      <Grid container spacing={4}>
        <Grid item size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>My Profile</Typography>
            {pendingChanges && <Alert severity="info" sx={{ mb: 2 }}>You have pending changes awaiting owner approval.</Alert>}
            <List>
              <ListItem><ListItemIcon><BadgeIcon /></ListItemIcon><ListItemText primary="Full Name" secondary={profile.fullName} /></ListItem>
              <ListItem><ListItemIcon><AccountCircleIcon /></ListItemIcon><ListItemText primary="Username" secondary={profile.username} /></ListItem>
              <ListItem><ListItemIcon><EmailIcon /></ListItemIcon><ListItemText primary="Email" secondary={profile.email} /></ListItem>
              <ListItem><ListItemIcon><VpnKeyIcon /></ListItemIcon><ListItemText primary="Password" secondary="********" /></ListItem>
            </List>
            <Button variant="contained" onClick={openUpdateModal} sx={{ mt: 2 }}>Request Profile Update</Button>
          </Paper>
        </Grid>
        <Grid item size={{ xs: 12, md: 6 }}>
          <Paper component="form" onSubmit={handleSavePersonalSettings} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Notification Settings</Typography>
            <FormControlLabel
              control={<Switch checked={personalSettings.notificationsEnabled} onChange={(e) => setPersonalSettings(p => ({ ...p, notificationsEnabled: e.target.checked }))} />}
              label="Enable Low Stock Email Alerts"
            />
            <TextField
              label="Notification Time"
              type="time"
              fullWidth
              value={personalSettings.notificationTime}
              onChange={(e) => setPersonalSettings(p => ({ ...p, notificationTime: e.target.value }))}
              disabled={!personalSettings.notificationsEnabled}
              InputLabelProps={{ shrink: true }}
              sx={{ mt: 2 }}
            />
            <Button type="submit" variant="contained" sx={{ mt: 3 }}>Save My Settings</Button>
            {message && <Alert severity="success" sx={{ mt: 2 }}>{message}</Alert>}
          </Paper>
        </Grid>
      </Grid>

      {/* Update Profile Dialog */}
      <Dialog open={showUpdateModal} onClose={closeUpdateModal} fullWidth maxWidth="sm">
        <DialogTitle>{requiresVerification ? 'Enter Verification Code' : 'Update My Profile'}</DialogTitle>
        {requiresVerification ? (
          <Box component="form" onSubmit={handleVerificationSubmit}>
            <DialogContent>
              <DialogContentText>{updateMessage}</DialogContentText>
              <Typography align="center" variant="h5" sx={{ my: 2 }}>{formatTime(timer)}</Typography>
              <TextField autoFocus required fullWidth label="Verification Code" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} />
              {updateError && <Alert severity="error" sx={{ mt: 2 }}>{updateError}</Alert>}
            </DialogContent>
            <DialogActions>
              <Button onClick={closeUpdateModal}>Cancel</Button>
              <Button type="submit" variant="contained">Verify & Save</Button>
            </DialogActions>
          </Box>
        ) : (
          <Box component="form" onSubmit={openConfirmModal}>
            <DialogContent>
              <TextField margin="dense" name="fullName" label="Full Name" type="text" fullWidth variant="outlined" value={updateFormData.fullName} onChange={e => setUpdateFormData(p => ({...p, fullName: e.target.value}))}/>
              <TextField margin="dense" name="username" label="Username" type="text" fullWidth variant="outlined" value={updateFormData.username} onChange={e => setUpdateFormData(p => ({...p, username: e.target.value}))}/>
              <TextField margin="dense" name="email" label="Email" type="email" fullWidth variant="outlined" value={updateFormData.email} onChange={e => setUpdateFormData(p => ({...p, email: e.target.value}))}/>
              <Divider sx={{ my: 2 }}><Typography variant="overline">Change Password (Optional)</Typography></Divider>
              <TextField margin="dense" name="oldPassword" label="Old Password" type="password" fullWidth variant="outlined" value={updateFormData.oldPassword} onChange={e => setUpdateFormData(p => ({...p, oldPassword: e.target.value}))}/>
              <TextField margin="dense" name="newPassword" label="New Password" type="password" fullWidth variant="outlined" value={updateFormData.newPassword} onChange={e => setUpdateFormData(p => ({...p, newPassword: e.target.value}))}/>
              <TextField margin="dense" name="confirmPassword" label="Confirm New Password" type="password" fullWidth variant="outlined" value={updateFormData.confirmPassword} onChange={e => setUpdateFormData(p => ({...p, confirmPassword: e.target.value}))}/>
              {updateError && <Alert severity="error" sx={{ mt: 2 }}>{updateError}</Alert>}
            </DialogContent>
            <DialogActions>
              <Button onClick={closeUpdateModal}>Cancel</Button>
              <Button type="submit" variant="contained">Review Changes</Button>
            </DialogActions>
          </Box>
        )}
      </Dialog>
      
      {/* Confirm Changes Dialog */}
      <Dialog open={showConfirmModal} onClose={() => setShowConfirmModal(false)}>
        <DialogTitle>Confirm Profile Update</DialogTitle>
        <DialogContent>
          <DialogContentText>The following changes will be submitted for approval:</DialogContentText>
          <List>
            {changesSummary.map((change, index) => (
              <ListItemText key={index} primary={change.field} secondary={`"${change.oldValue}"  →  "${change.newValue}"`} />
            ))}
          </List>
          {updateError && <Alert severity="error">{updateError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmModal(false)}>Cancel</Button>
          <Button onClick={confirmProfileUpdate} autoFocus>Confirm & Submit</Button>
        </DialogActions>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessModal} onClose={() => setShowSuccessModal(false)}>
        <DialogContent sx={{ textAlign: 'center', p: 4 }}>
          <CheckCircleOutlineIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h5" gutterBottom>Success!</Typography>
          <DialogContentText>{updateMessage}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button onClick={() => setShowSuccessModal(false)} variant="contained">OK</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SettingsPage;