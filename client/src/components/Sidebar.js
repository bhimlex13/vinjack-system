// client/src/components/Sidebar.js
import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import {
  FaTachometerAlt, FaBoxOpen, FaShoppingCart, FaTruck, FaChartBar,
  FaUsersCog, FaDatabase, FaFileAlt, FaChevronLeft
} from 'react-icons/fa';
import '../styles/MainLayout.css';

const Sidebar = ({ isCollapsed, toggleSidebar }) => {
  const { user } = useContext(AuthContext);

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div>
        <div className="sidebar-header">
          <img src="/assets/vinjack_logo.png" alt="VinJack Logo" className="logo-img" />
          {!isCollapsed && <h3>VinJack MS</h3>}


          <div className="sidebar-footer">
            {!isCollapsed && (
              <button className="sidebar-toggle-footer" onClick={toggleSidebar}>
                <FaChevronLeft />
              </button>
            )}
          </div>
        </div>

        <nav className="sidebar-nav">
          {!isCollapsed && <span className="nav-group-title">Main</span>}
          <NavLink to="/dashboard"><FaTachometerAlt /> {!isCollapsed && <span>Dashboard</span>}</NavLink>
          <NavLink to="/sales"><FaShoppingCart /> {!isCollapsed && <span>Sales (POS)</span>}</NavLink>

          {!isCollapsed && <span className="nav-group-title">Management</span>}
          <NavLink to="/inventory"><FaBoxOpen /> {!isCollapsed && <span>Inventory</span>}</NavLink>
          <NavLink to="/suppliers"><FaTruck /> {!isCollapsed && <span>Suppliers</span>}</NavLink>
          <NavLink to="/reports"><FaChartBar /> {!isCollapsed && <span>Reports</span>}</NavLink>

          {user && user.role === 'Owner' && (
            <>
              {!isCollapsed && <span className="nav-group-title">Administration</span>}
              <NavLink to="/user-management"><FaUsersCog /> {!isCollapsed && <span>User Management</span>}</NavLink>
              <NavLink to="/data-management"><FaDatabase /> {!isCollapsed && <span>Data Management</span>}</NavLink>
              <NavLink to="/audit-log"><FaFileAlt /> {!isCollapsed && <span>Audit Log</span>}</NavLink>
            </>
          )}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;