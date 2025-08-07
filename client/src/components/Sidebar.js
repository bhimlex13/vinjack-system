// client/src/components/Sidebar.js
import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { FaBell } from 'react-icons/fa';
import '../styles/MainLayout.css';

const Sidebar = () => {
  // This line is now updated with a default value to prevent the error
  const { lowStockItems = [] } = useContext(AuthContext);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>VinJack MS</h3>
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
      </nav>
    </div>
  );
};

export default Sidebar;