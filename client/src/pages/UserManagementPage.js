// client/src/pages/UserManagementPage.js
import React, { useState, useEffect, useMemo, useContext } from 'react';
import api from '../api/axios';
import AuthContext from '../context/AuthContext';
import { approveUserUpdate, rejectUserUpdate } from '../api/userApi';
import '../styles/UserManagementPage.css';
import Modal from '../components/Modal';
import EditUserModal from '../components/EditUserModal';

const UserManagementPage = () => {
  const { token } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setIsLoading(false);
    }
  };

  const pendingRegistrations = useMemo(() => users.filter(u => u.status === 'pending'), [users]);
  const profileUpdateRequests = useMemo(() => users.filter(u => u.hasPendingChanges), [users]);
  const managedUsers = useMemo(() => users.filter(u => u.status !== 'pending'), [users]);

  const handleApproveProfile = async (userId) => {
    await approveUserUpdate(token, userId);
    fetchUsers();
  };

  const handleRejectProfile = async (userId) => {
    await rejectUserUpdate(token, userId);
    fetchUsers();
  };

  const handleApproveRegistration = async (userId) => {
    try {
      await api.put(`/users/${userId}`, { status: 'active' });
      fetchUsers();
    } catch {
      alert('Failed to approve user.');
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to permanently delete this user?')) {
      try {
        await api.delete(`/users/${userId}`);
        setUsers(users.filter(user => user._id !== userId));
      } catch {
        alert('Failed to delete user.');
      }
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  if (isLoading) return <div className="loading">Loading users...</div>;

  return (
    <div className="user-management-container">
      {isEditModalOpen && (
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit User">
          <EditUserModal 
            user={editingUser}
            onClose={() => setIsEditModalOpen(false)}
            onUserUpdate={fetchUsers}
            onUserDelete={handleDelete}
          />
        </Modal>
      )}

      {/* Profile Update Requests */}
      <section className="user-section">
        <h2>Profile Update Requests</h2>
        {profileUpdateRequests.length > 0 ? (
          <table className="user-table">
            <thead>
              <tr>
                <th>Current Info</th>
                <th>Requested Changes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {profileUpdateRequests.map(user => (
                <tr key={user._id}>
                  <td>
                    <strong>{user.fullName}</strong> ({user.username})<br/>
                    {user.email}
                  </td>
                  <td>
                    <strong>{user.pendingChanges.fullName || user.fullName}</strong> ({user.pendingChanges.username || user.username})<br/>
                    {user.pendingChanges.email || user.email}
                  </td>
                  <td className="actions">
                    <button className="action-btn approve-btn" onClick={() => handleApproveProfile(user._id)}>Approve</button>
                    <button className="action-btn delete-btn" onClick={() => handleRejectProfile(user._id)}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No profile update requests.</p>
        )}
      </section>

      {/* Pending Registrations */}
      <section className="user-section">
        <h2>Pending Registrations</h2>
        {pendingRegistrations.length > 0 ? (
          <table className="user-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingRegistrations.map(user => (
                <tr key={user._id}>
                  <td>{user.fullName}</td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td className="actions">
                    <button className="action-btn approve-btn" onClick={() => handleApproveRegistration(user._id)}>Approve</button>
                    <button className="action-btn delete-btn" onClick={() => handleDelete(user._id)}>Deny</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No new user registrations to approve.</p>
        )}
      </section>

      {/* Active Users */}
      <section className="user-section">
        <h2>Active & Archived Users</h2>
        <table className="user-table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {managedUsers.map(user => (
              <tr key={user._id}>
                <td>{user.fullName}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <span className={`status-badge status-${user.status}`}>
                    {user.status}
                  </span>
                </td>
                <td className="actions">
                  <button 
                    className="action-btn edit-btn" 
                    onClick={() => openEditModal(user)}
                    disabled={user.role === 'Owner'}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default UserManagementPage;
