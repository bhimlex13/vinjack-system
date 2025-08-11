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
  const [editMode, setEditMode] = useState({});
  const [pendingChanges, setPendingChanges] = useState(null);

  const [personalSettings, setPersonalSettings] = useState({
    notificationsEnabled: true,
    notificationTime: '08:00'
  });

  const [message, setMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [changesSummary, setChangesSummary] = useState([]);

  // Fetch profile + personal settings
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, profileRes] = await Promise.all([
          api.get('/settings'),
          api.get('/users/me')
        ]);
        setPersonalSettings(settingsRes.data);
        setProfile({
          fullName: profileRes.data.fullName,
          username: profileRes.data.username,
          email: profileRes.data.email
        });
        setOriginalProfile({
          fullName: profileRes.data.fullName,
          username: profileRes.data.username,
          email: profileRes.data.email
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

  const handleFieldEdit = (field) => {
    setEditMode(prev => ({ ...prev, [field]: true }));
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
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
      await api.put('/settings', personalSettings);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Failed to save settings.');
    }
  };

  const openConfirmModal = (e) => {
    e.preventDefault();
    const changes = Object.keys(profile)
      .filter(key => profile[key] !== originalProfile[key])
      .map(key => ({
        field: key,
        oldValue: originalProfile[key],
        newValue: profile[key]
      }));
    if (changes.length === 0) {
      setMessage('No changes to request.');
      return;
    }
    setChangesSummary(changes);
    setShowConfirmModal(true);
  };

  const confirmProfileUpdate = async () => {
    try {
      await requestProfileUpdate(token, profile);
      setMessage('Profile update request sent for approval.');
      setPendingChanges(profile);
    } catch {
      setMessage('Failed to request profile update.');
    } finally {
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="settings-container">
      <h1>My Settings</h1>

      {/* Profile Section */}
      <form className="settings-form" onSubmit={openConfirmModal}>
        <h2>My Profile</h2>

        {['fullName', 'username', 'email'].map((field) => (
          <div className="form-group" key={field}>
            <label>{field === 'fullName' ? 'Full Name' : field.charAt(0).toUpperCase() + field.slice(1)}</label>
            {editMode[field] ? (
              <input
                type={field === 'email' ? 'email' : 'text'}
                name={field}
                value={profile[field]}
                onChange={handleProfileChange}
              />
            ) : (
              <p className="email-display">{profile[field]}</p>
            )}
            {!editMode[field] && (
              <button
                type="button"
                className="edit-btn-inline"
                onClick={() => handleFieldEdit(field)}
              >
                Edit
              </button>
            )}
          </div>
        ))}

        {pendingChanges && (
          <p className="pending-changes-notice">
            You have pending changes awaiting approval.
          </p>
        )}

        <button type="submit" className="save-btn">Request Profile Update</button>
      </form>

      {/* Personal Notification Settings */}
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

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Profile Update</h3>
            <p>The following changes will be submitted for approval:</p>
            <ul>
              {changesSummary.map((change, index) => (
                <li key={index}>
                  <strong>{change.field}:</strong> "{change.oldValue}" → "{change.newValue}"
                </li>
              ))}
            </ul>
            <div className="modal-actions">
              <button className="approve-btn" onClick={confirmProfileUpdate}>Confirm</button>
              <button className="delete-btn" onClick={() => setShowConfirmModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
