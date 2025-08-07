// client/src/components/Sidebar.js
import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { FaBell } from 'react-icons/fa';
import '../styles/MainLayout.css';

const Sidebar = () => {
  const { lowStockItems = [], logout, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="sidebar">
      <div>
        <div className="sidebar-header">
          <h3>VinJack MS</h3>
        </div>
        <div className="user-info">
          <p>Welcome, {user?.fullName || 'User'}</p>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/inventory">Inventory</NavLink>
          <NavLink to="/sales">Sales (POS)</NavLink>
          <NavLink to="/suppliers">Suppliers</NavLink>
          <NavLink to="/alerts" className="alerts-link">
            <div className="link-content">
              <FaBell /> 
              <span>Alerts</span>
            </div>
            {lowStockItems.length > 0 && (
              <span className="notification-badge">{lowStockItems.length}</span>
            )}
          </NavLink>
          <NavLink to="/reports">Reports</NavLink>
          
          {/* --- THIS IS THE CHANGE --- */}
          {/* Now only the Owner can see the Settings and Audit Log links */}
          {user && user.role === 'Owner' && (
            <>
              <NavLink to="/settings">Settings</NavLink>
              <NavLink to="/audit-log">Audit Log</NavLink>
            </>
          )}
        </nav>
      </div>
      
      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;