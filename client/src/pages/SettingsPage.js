// client/src/pages/SettingsPage.js
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import '../styles/SettingsPage.css';

const SettingsPage = () => {
  const [personalSettings, setPersonalSettings] = useState({
    notificationsEnabled: true,
    notificationTime: '08:00'
  });
  const [notificationEmail, setNotificationEmail] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const personalRes = await api.get('/settings');
        setPersonalSettings(personalRes.data);
        
        const appRes = await api.get('/settings/global/notificationEmail');
        setNotificationEmail(appRes.data.value);
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
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      await api.put('/settings', personalSettings);
      
      const emailSetting = { key: 'notificationEmail', value: notificationEmail };
      await api.put('/settings/global', emailSetting);

      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to save settings.');
    }
  };

  return (
    <div className="settings-container">
      <h1>Settings</h1>
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
            {/* THIS IS THE CHANGE: Replaced the <select> with <input type="time"> */}
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

        <section>
          <h2>Global App Settings</h2>
          <p>Set the email address that will receive all low-stock notifications.</p>
          <div className="form-group">
            <label htmlFor="notificationEmail">Recipient Email</label>
            <input
              type="email"
              id="notificationEmail"
              className="email-input"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder="owner@example.com"
            />
          </div>
        </section>

        <button type="submit" className="save-btn">Save All Settings</button>
        {message && <p className="success-message">{message}</p>}
      </form>
    </div>
  );
};

export default SettingsPage;
