// client/src/components/Navbar.js
import React, { useState, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaBell, FaCog, FaSignOutAlt } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import '../styles/MainLayout.css';

const Navbar = ({ isSidebarCollapsed, toggleSidebar }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const { user, logout, lowStockItems = [] } = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();

    const getPageTitle = (pathname) => {
        const name = pathname.split('/').pop().replace(/-/g, ' ');
        if (pathname === '/dashboard' || pathname === '/') return 'Dashboard';
        if (!name) return 'Dashboard';
        return name.charAt(0).toUpperCase() + name.slice(1);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="navbar">
            <div className="navbar-left">
                {isSidebarCollapsed && (
                    <button className="sidebar-toggle" onClick={toggleSidebar}>
                        <FaBars />
                    </button>
                )}
                <h1 className="page-title">{getPageTitle(location.pathname)}</h1>
            </div>
            <div className="navbar-right">
                <Link to="/alerts" className="alerts-link-nav">
                    <FaBell />
                    {lowStockItems.length > 0 && (
                        <span className="notification-badge-nav">{lowStockItems.length}</span>
                    )}
                </Link>
                <div className="user-dropdown">
                    <span onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                        {user?.fullName || 'User'}
                    </span>
                    {isDropdownOpen && (
                        <div className="dropdown-menu">
                            {user && <Link to="/settings"><FaCog /> Settings</Link>}
                            <button onClick={handleLogout}><FaSignOutAlt /> Logout</button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Navbar;