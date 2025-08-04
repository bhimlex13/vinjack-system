// client/src/components/Sidebar.js
import React from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/MainLayout.css'; // We'll create this file next

const Sidebar = () => {
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
        <NavLink to="/reports">Reports</NavLink>
      </nav>
    </div>
  );
};

export default Sidebar;