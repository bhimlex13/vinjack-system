// client/src/pages/SettingsPage.js
import React, { useState, useEffect, useContext, useRef } from 'react';
import api from '../api/axios';
import AuthContext from '../context/AuthContext';
import { requestProfileUpdate, verifyOwnerUpdate } from '../api/userApi';
import '../styles/SettingsPage.css';

const SettingsPage = () => {
  // MODIFIED: We only need the user object, not the token directly
  const { user } = useContext(AuthContext);

  const [profile, setProfile] = useState({ fullName: '', username: '', email: '' });
  const [originalProfile, setOriginalProfile] = useState({});
  const [personalSettings, setPersonalSettings] = useState({
    notificationsEnabled: true,
    notificationTime: '08:00'
  });
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
      try {
        // The interceptor in axios.js handles the token, so no need to pass headers manually
        const [settingsRes, profileRes] = await Promise.all([
          api.get('/settings'),
          api.get('/users/me')
        ]);

        if (settingsRes.data) {
            setPersonalSettings(settingsRes.data);
        }
        
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
    if (user) { // Depend on user object instead of token
        fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (requiresVerification) {
      timerId.current = setInterval(() => {
        setTimer(prevTimer => prevTimer - 1);
      }, 1000);
    }
    return () => clearInterval(timerId.current);
  }, [requiresVerification]);

  useEffect(() => {
    if (timer <= 0 && requiresVerification) {
      clearInterval(timerId.current);
      setUpdateError("Time has expired. Please try again.");
      setTimeout(() => closeUpdateModal(), 2000);
    }
  }, [timer, requiresVerification]);


  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const handlePersonalChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPersonalSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSavePersonalSettings = async (e) => {
    e.preventDefault();
    try {
      // The interceptor in axios.js handles the token
      await api.put('/settings', personalSettings);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Failed to save settings.');
    }
  };

  const handleUpdateFormChange = (e) => {
    const { name, value } = e.target;
    setUpdateFormData(prev => ({ ...prev, [name]: value }));
  };

  const openUpdateModal = () => {
    setUpdateFormData({
      fullName: profile.fullName,
      username: profile.username,
      email: profile.email,
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setUpdateMessage('');
    setUpdateError('');
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
    if (updateFormData.fullName !== originalProfile.fullName) {
      changes.push({ field: 'Full Name', oldValue: originalProfile.fullName, newValue: updateFormData.fullName });
    }
    if (updateFormData.username !== originalProfile.username) {
      changes.push({ field: 'Username', oldValue: originalProfile.username, newValue: updateFormData.username });
    }
    if (updateFormData.email !== originalProfile.email) {
      changes.push({ field: 'Email', oldValue: originalProfile.email, newValue: updateFormData.email });
    }
    if (updateFormData.newPassword) {
      if (!updateFormData.oldPassword) {
        setUpdateError('Old password is required to change password.');
        return;
      }
      if (updateFormData.newPassword !== updateFormData.confirmPassword) {
        setUpdateError('New passwords do not match.');
        return;
      }
      changes.push({ field: 'Password', oldValue: '********', newValue: '********' });
    }
    if (changes.length === 0) {
      setUpdateError('No changes to request.');
      return;
    }
    setChangesSummary(changes);
    setShowConfirmModal(true);
  };

  const confirmProfileUpdate = async () => {
    setUpdateError('');
    setUpdateMessage('');
    try {
      // --- THE FIX: Removed the extra 'token' argument ---
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
      const errorMessage = err.response?.data?.message || 'Failed to request profile update.';
      setUpdateError(errorMessage);
      setShowConfirmModal(false);
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    setUpdateError('');
    clearInterval(timerId.current); 

    try {
      // The userApi function doesn't need the token passed here
      const response = await verifyOwnerUpdate(verificationCode);
      setUpdateMessage(response.data.message);

      const updatedProfile = {
        fullName: updateFormData.fullName,
        username: updateFormData.username,
        email: updateFormData.email
      };
      setProfile(updatedProfile);
      setOriginalProfile(updatedProfile);
      setPendingChanges(null);

      setShowSuccessModal(true);
      setShowUpdateModal(false);

    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Verification failed.';
      setUpdateError(errorMessage);
    }
  };

  // ... (The JSX part of the component remains unchanged) ...
  return (
    <div className="settings-container">
      <h1>My Settings</h1>
      <section className="settings-form profile-section">
        <h2>My Profile</h2>
        {pendingChanges && ( <p className="pending-changes-notice">You have pending changes awaiting owner approval.</p>)}
        <div className="form-group profile-info-group"><strong>Full Name:</strong> <p>{profile.fullName}</p></div>
        <div className="form-group profile-info-group"><strong>Username:</strong> <p>{profile.username}</p></div>
        <div className="form-group profile-info-group"><strong>Email:</strong> <p>{profile.email}</p></div>
        <div className="form-group profile-info-group"><strong>Password:</strong> <p>********</p></div>
        <button type="button" className="save-btn" onClick={openUpdateModal}>Request Profile Update</button>
      </section>

      <form className="settings-form" onSubmit={handleSavePersonalSettings}>
        <section>
          <h2>My Notification Settings</h2>
          <div className="form-group"><label className="toggle-switch"><input type="checkbox" name="notificationsEnabled" checked={personalSettings.notificationsEnabled} onChange={handlePersonalChange}/><span className="slider"></span></label><span>Enable My Low Stock Email Alerts</span></div>
          <div className="form-group"><label htmlFor="notificationTime">My Notification Time</label><input type="time" id="notificationTime" name="notificationTime" className="time-input" value={personalSettings.notificationTime} onChange={handlePersonalChange} disabled={!personalSettings.notificationsEnabled}/></div>
        </section>
        <button type="submit" className="save-btn">Save My Settings</button>
      </form>

      {message && <p className="success-message">{message}</p>}

      {showUpdateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{requiresVerification ? 'Enter Verification Code' : 'Update My Profile'}</h3>
            {requiresVerification ? (
              <form onSubmit={handleVerificationSubmit}>
                <p className="info-message">{updateMessage}</p>
                <div className="timer-display">Time Remaining: {formatTime(timer)}</div>
                <div className="form-group"><label>Verification Code</label><input type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="Enter 6-digit code from email" required className="otp-input"/></div>
                {updateError && <p className="error-message">{updateError}</p>}
                <div className="modal-actions"><button type="submit" className="save-btn">Verify & Save</button><button type="button" className="delete-btn" onClick={closeUpdateModal}>Cancel</button></div>
              </form>
            ) : (
              <form onSubmit={openConfirmModal}>
                <div className="form-group"><label>Full Name</label><input type="text" name="fullName" value={updateFormData.fullName} onChange={handleUpdateFormChange}/></div>
                <div className="form-group"><label>Username</label><input type="text" name="username" value={updateFormData.username} onChange={handleUpdateFormChange}/></div>
                <div className="form-group"><label>Email</label><input type="email" name="email" value={updateFormData.email} onChange={handleUpdateFormChange}/></div>
                <hr /><p>Change Password (optional)</p>
                <div className="form-group"><label>Old Password</label><input type="password" name="oldPassword" value={updateFormData.oldPassword} onChange={handleUpdateFormChange}/></div>
                <div className="form-group"><label>New Password</label><input type="password" name="newPassword" value={updateFormData.newPassword} onChange={handleUpdateFormChange}/></div>
                <div className="form-group"><label>Confirm New Password</label><input type="password" name="confirmPassword" value={updateFormData.confirmPassword} onChange={handleUpdateFormChange}/></div>
                {updateError && <p className="error-message">{updateError}</p>}
                <div className="modal-actions"><button type="submit" className="save-btn">Review Changes</button><button type="button" className="delete-btn" onClick={closeUpdateModal}>Cancel</button></div>
              </form>
            )}
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Profile Update</h3>
            <p>The following changes will be submitted for approval:</p>
            <ul>{changesSummary.map((change, index) => (<li key={index}><strong>{change.field}:</strong> "{change.oldValue}" → "{change.newValue}"</li>))}</ul>
            {updateError && <p className="error-message">{updateError}</p>}
            <div className="modal-actions"><button className="approve-btn" onClick={confirmProfileUpdate}>Confirm & Submit</button><button className="delete-btn" onClick={() => setShowConfirmModal(false)}>Cancel</button></div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content success-modal">
            <div className="success-icon">✅</div>
            <h3>Success!</h3>
            <p>{updateMessage}</p>
            <div className="modal-actions"><button className="save-btn" onClick={() => setShowSuccessModal(false)}>OK</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;