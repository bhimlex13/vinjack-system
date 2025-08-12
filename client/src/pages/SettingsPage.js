// client/src/pages/SettingsPage.js
import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import AuthContext from '../context/AuthContext';
import { requestProfileUpdate } from '../api/userApi';
import '../styles/SettingsPage.css';

const SettingsPage = () => {
  const { token } = useContext(AuthContext);

  const [profile, setProfile] = useState({ fullName: '', username: '', email: '' });
  const [originalProfile, setOriginalProfile] = useState({});
  const [personalSettings, setPersonalSettings] = useState({
    notificationsEnabled: true,
    notificationTime: '08:00'
  });
  const [message, setMessage] = useState('');
  const [pendingChanges, setPendingChanges] = useState(null);

  // New states for the update form and password fields
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateFormData, setUpdateFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [changesSummary, setChangesSummary] = useState([]);
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateError, setUpdateError] = useState('');

  // Fetch profile and personal settings
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, profileRes] = await Promise.all([
          api.get('/settings'),
          api.get('/users/me')
        ]);
        setPersonalSettings(settingsRes.data);
        const userProfile = {
          fullName: profileRes.data.fullName,
          username: profileRes.data.username,
          email: profileRes.data.email
        };
        setProfile(userProfile);
        setOriginalProfile(userProfile);
        setUpdateFormData({
          fullName: userProfile.fullName,
          username: userProfile.username,
          email: userProfile.email,
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        if (profileRes.data.hasPendingChanges) {
          setPendingChanges(profileRes.data.pendingChanges);
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      }
    };
    fetchData();
  }, []);

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
      await api.put('/settings', personalSettings);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Failed to save settings.');
    }
  };

  // Profile update form handlers
  const handleUpdateFormChange = (e) => {
    const { name, value } = e.target;
    setUpdateFormData(prev => ({ ...prev, [name]: value }));
  };

  const openUpdateModal = () => {
    // Pre-populate the form data with current profile info before opening the modal
    setUpdateFormData({
      fullName: profile.fullName,
      username: profile.username,
      email: profile.email,
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setShowUpdateModal(true);
  };

  const closeUpdateModal = () => {
      // Clear all state related to the update modal
      setUpdateFormData({
          fullName: profile.fullName,
          username: profile.username,
          email: profile.email,
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
      });
      setShowUpdateModal(false);
      setUpdateError('');
  };

  const openConfirmModal = (e) => {
    e.preventDefault();
    setUpdateError('');

    // Prepare a summary of all changes
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
    try {
      const response = await requestProfileUpdate(token, updateFormData);
      
      // Handle success
      setUpdateMessage(response.data.message);
      // Update the main profile and clear pending changes
      setProfile(prev => ({
        ...prev,
        ...updateFormData
      }));
      setPendingChanges(null);
    } catch (err) {
      // Handle error
      const errorMessage = err.response?.data?.message || 'Failed to request profile update.';
      setUpdateError(errorMessage);
    } finally {
      setShowConfirmModal(false);
      setShowUpdateModal(false);
      setTimeout(() => {
        setUpdateMessage('');
        setUpdateError('');
      }, 5000);
    }
  };

  return (
    <div className="settings-container">
      <h1>My Settings</h1>

      {/* Profile Section */}
      <section className="settings-form profile-section">
        <h2>My Profile</h2>
        {pendingChanges && (
          <p className="pending-changes-notice">
            You have pending changes awaiting owner approval.
          </p>
        )}
        <div className="form-group profile-info-group">
          <strong>Full Name:</strong> <p>{profile.fullName}</p>
        </div>
        <div className="form-group profile-info-group">
          <strong>Username:</strong> <p>{profile.username}</p>
        </div>
        <div className="form-group profile-info-group">
          <strong>Email:</strong> <p>{profile.email}</p>
        </div>
        <div className="form-group profile-info-group">
          <strong>Password:</strong> <p>********</p>
        </div>
        <button type="button" className="save-btn" onClick={openUpdateModal}>
          Request Profile Update
        </button>
        {updateMessage && <p className="success-message">{updateMessage}</p>}
        {updateError && <p className="error-message">{updateError}</p>}
      </section>

      {/* Personal Settings Section */}
      <form className="settings-form" onSubmit={handleSavePersonalSettings}>
        <section>
          <h2>My Notification Settings</h2>
          <div className="form-group">
            <label className="toggle-switch">
              <input
                type="checkbox"
                name="notificationsEnabled"
                checked={personalSettings.notificationsEnabled}
                onChange={handlePersonalChange}
              />
              <span className="slider"></span>
            </label>
            <span>Enable My Low Stock Email Alerts</span>
          </div>
          <div className="form-group">
            <label htmlFor="notificationTime">My Notification Time</label>
            <input
              type="time"
              id="notificationTime"
              name="notificationTime"
              className="time-input"
              value={personalSettings.notificationTime}
              onChange={handlePersonalChange}
              disabled={!personalSettings.notificationsEnabled}
            />
          </div>
        </section>
        <button type="submit" className="save-btn">Save My Settings</button>
      </form>

      {message && <p className="success-message">{message}</p>}

      {/* Profile Update Modal */}
      {showUpdateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Update My Profile</h3>
            <form onSubmit={openConfirmModal}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={updateFormData.fullName}
                  onChange={handleUpdateFormChange}
                />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  value={updateFormData.username}
                  onChange={handleUpdateFormChange}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={updateFormData.email}
                  onChange={handleUpdateFormChange}
                />
              </div>
              <hr />
              <p>Change Password (optional)</p>
              <div className="form-group">
                <label>Old Password</label>
                <input
                  type="password"
                  name="oldPassword"
                  value={updateFormData.oldPassword}
                  onChange={handleUpdateFormChange}
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={updateFormData.newPassword}
                  onChange={handleUpdateFormChange}
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={updateFormData.confirmPassword}
                  onChange={handleUpdateFormChange}
                />
              </div>
              {updateError && <p className="error-message">{updateError}</p>}
              <div className="modal-actions">
                <button type="submit" className="save-btn">Review Changes</button>
                <button type="button" className="delete-btn" onClick={closeUpdateModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Profile Update</h3>
            <p>The following changes will be submitted for owner approval:</p>
            <ul>
              {changesSummary.map((change, index) => (
                <li key={index}>
                  <strong>{change.field}:</strong> "{change.oldValue}" → "{change.newValue}"
                </li>
              ))}
            </ul>
            <div className="modal-actions">
              <button className="approve-btn" onClick={confirmProfileUpdate}>Confirm & Submit</button>
              <button className="delete-btn" onClick={() => setShowConfirmModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;