// client/src/pages/UserManagementPage.js
import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import '../styles/UserManagementPage.css';
import Modal from '../components/Modal';
import EditUserModal from '../components/EditUserModal';

const UserManagementPage = () => {
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

  const pendingUsers = useMemo(() => users.filter(u => u.status === 'pending'), [users]);
  const managedUsers = useMemo(() => users.filter(u => u.status !== 'pending'), [users]);

  const handleApprove = async (userId) => {
    try {
      await api.put(`/users/${userId}`, { status: 'active' });
      fetchUsers();
    } catch (error) {
      alert('Failed to approve user.');
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to permanently delete this user? This cannot be undone.')) {
      try {
        await api.delete(`/users/${userId}`);
        setUsers(users.filter(user => user._id !== userId));
      } catch (error) {
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
            onUserDelete={handleDelete} // Pass the delete handler to the modal
          />
        </Modal>
      )}

      <section className="user-section">
        <h2>Pending Approvals</h2>
        {pendingUsers.length > 0 ? (
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
              {pendingUsers.map(user => (
                <tr key={user._id}>
                  <td>{user.fullName}</td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td className="actions">
                    <button className="action-btn approve-btn" onClick={() => handleApprove(user._id)}>Approve</button>
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

      <section className="user-section">
        <h2>Active & Archived Users</h2>
        <table className="user-table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Username</th>
              <th>Email</th> {/* <-- ADDED EMAIL HEADER */}
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
                <td>{user.email}</td> {/* <-- ADDED EMAIL DATA */}
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
                  {/* The Delete button is no longer here */}
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