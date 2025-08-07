// client/src/pages/AuditLogPage.js
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import '../styles/AuditLogPage.css';

const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await api.get('/audit-logs');
        setLogs(response.data);
      } catch (error) {
        console.error("Failed to fetch audit logs", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  if (isLoading) return <div className="loading">Loading logs...</div>;

  return (
    <div className="audit-log-container">
      <h1>Audit Log</h1>
      <p>A record of all important actions performed by users.</p>
      <table className="log-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>User</th>
            <th>Action</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log._id}>
              <td>{new Date(log.createdAt).toLocaleString()}</td>
              <td>{log.user?.fullName || 'N/A'}</td>
              <td><span className="action-tag">{log.action.replace('_', ' ')}</span></td>
              <td>{log.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AuditLogPage;