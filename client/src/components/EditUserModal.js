// client/src/components/EditUserModal.js
import React, { useState, useContext } from 'react'; 
import api from '../api/axios';
import '../styles/UserManagementPage.css';
import ConfirmationContext from '../context/ConfirmationContext';

const EditUserModal = ({ user, onClose, onUserUpdate, onUserDelete }) => {
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);
  const { confirm } = useContext(ConfirmationContext); // Get the confirm function

  const handleUpdate = async () => {
    const isConfirmed = await confirm('Are you sure you want to save these changes?');
    if (isConfirmed) {
      try {
        await api.put(`/users/${user._id}`, { role, status });
        onUserUpdate();
        onClose();
      } catch (error) {
        alert('Failed to update user.');
      }
    }
  };

  const handleDelete = async () => {
    const isConfirmed = await confirm('Are you sure you want to permanently delete this user? This cannot be undone.');
    if (isConfirmed) {
      onUserDelete(user._id);
      onClose();
    }
  };

  return (
    <div className="edit-user-modal">
      <h4>Editing: {user.fullName}</h4>
      <div className="form-group">
        <label htmlFor="role-select">Role</label>
        <select id="role-select" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="Mechanic">Mechanic</option>
          <option value="Clerk">Clerk</option>
          <option value="Owner">Owner</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="status-select">Account Status</label>
        <select id="status-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">Active</option>
          <option value="inactive">Archived (Inactive)</option>
        </select>
      </div>
      <div className="modal-actions">
        {/* New Delete Button */}
        <button className="action-btn delete-btn" onClick={handleDelete}>Delete User</button>
        <div className="modal-actions-right">
            <button className="action-btn" onClick={onClose}>Cancel</button>
            <button className="action-btn save-btn" onClick={handleUpdate}>Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;