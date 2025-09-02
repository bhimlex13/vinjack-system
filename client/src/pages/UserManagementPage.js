// client/src/pages/UserManagementPage.js
import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { approveUserUpdate, rejectUserUpdate } from '../api/userApi';
import '../styles/UserManagementPage.css';
import Modal from '../components/Modal';
import EditUserModal from '../components/EditUserModal';
// ADDED: Import new modals
import CreateUserModal from '../components/CreateUserModal'; 
import CredentialsDisplayModal from '../components/CredentialsDisplayModal';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // ADDED: State for the new user creation flow
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCredentials, setNewCredentials] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
      setError('Failed to fetch users.');
    } finally {
      setIsLoading(false);
    }
  };

  const profileUpdateRequests = useMemo(() => users.filter(u => u.hasPendingChanges), [users]);
  // MODIFIED: managedUsers now filters 'Owner' role as well for display
  const managedUsers = useMemo(() => users.filter(u => u.role !== 'Owner'), [users]);


  // Handler for when user creation is successful
  const handleUserCreated = (credentials) => {
    setIsCreateModalOpen(false);
    setNewCredentials(credentials); // This will trigger the credentials display modal
    fetchUsers(); // Refresh the user list
  };

  const handleApproveProfile = async (userId) => {
    try {
      await approveUserUpdate(userId);
      setMessage('Profile update approved successfully!');
      fetchUsers();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to approve profile update.';
      setError(errorMessage);
    } finally {
      setTimeout(() => {
        setMessage('');
        setError('');
      }, 5000);
    }
  };

  const handleRejectProfile = async (userId) => {
    try {
      await rejectUserUpdate(userId);
      setMessage('Profile update request rejected.');
      fetchUsers();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to reject profile update.';
      setError(errorMessage);
    } finally {
      setTimeout(() => {
        setMessage('');
        setError('');
      }, 5000);
    }
  };
  
  const openEditModal = (user) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  if (isLoading) return <div className="loading">Loading users...</div>;

  return (
    <div className="user-management-container">
      {/* --- MODALS --- */}
      {isEditModalOpen && (
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit User">
          <EditUserModal 
            user={editingUser}
            onClose={() => setIsEditModalOpen(false)}
            onUserUpdate={fetchUsers}
          />
        </Modal>
      )}

      {isCreateModalOpen && (
        <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Employee">
          <CreateUserModal 
            onClose={() => setIsCreateModalOpen(false)}
            onUserCreated={handleUserCreated}
          />
        </Modal>
      )}

      {newCredentials && (
        <CredentialsDisplayModal
          credentials={newCredentials}
          onClose={() => setNewCredentials(null)}
        />
      )}

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

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
                    <strong>{user.pendingChanges?.fullName || user.fullName}</strong> ({user.pendingChanges?.username || user.username})<br/>
                    {user.pendingChanges?.email || user.email}
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

      {/* REMOVED: Pending Registrations Section */}

      <section className="user-section">
        <div className="section-header">
            <h2>Manage Employees</h2>
            <button className="add-employee-btn" onClick={() => setIsCreateModalOpen(true)}>
              + Add New Employee
            </button>
        </div>
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