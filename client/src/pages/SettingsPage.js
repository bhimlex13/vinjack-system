// client/src/pages/SettingsPage.js
import React, { useState, useEffect, useContext } from 'react'; // Import useContext
import api from '../api/axios';
import AuthContext from '../context/AuthContext'; // Import AuthContext
import '../styles/SettingsPage.css';

const SettingsPage = () => {
  const { user } = useContext(AuthContext); // Get the logged-in user

  const [personalSettings, setPersonalSettings] = useState({
    notificationsEnabled: true,
    notificationTime: '08:00'
  });
  const [message, setMessage] = useState('');

  // Fetch only the user's personal settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const personalRes = await api.get('/settings');
        setPersonalSettings(personalRes.data);
      } catch (error) {
        console.error("Failed to fetch settings", error);
      }
    };
    fetchSettings();
  }, []);

  const handlePersonalChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPersonalSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // The submit handler is now simpler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      // It only needs to save the personal settings now
      await api.put('/settings', personalSettings);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to save settings.');
    }
  };

  return (
    <div className="settings-container">
      <h1>My Settings</h1>
      <form className="settings-form" onSubmit={handleSubmit}>
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
          <div className="form-group">
            <label>Recipient Email</label>
            {/* THIS IS THE CHANGE: Display the user's email as non-editable text */}
            <p className="email-display">{user?.email || 'No email on record.'}</p>
          </div>
        </section>

        <button type="submit" className="save-btn">Save My Settings</button>
        {message && <p className="success-message">{message}</p>}
      </form>
    </div>
  );
};

export default SettingsPage;
