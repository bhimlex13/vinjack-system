// client/src/components/Navbar.js
import React, { useState, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaBell, FaCog, FaSignOutAlt } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import '../styles/MainLayout.css';
// NEW: Import the new stylesheet for notifications
import '../styles/Notifications.css'; 

const Navbar = ({ isSidebarCollapsed, toggleSidebar }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    // NEW: State to manage the notification dropdown visibility
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false); 
    const { user, logout, notifications, markNotificationsAsRead } = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();

    // Calculate the number of unread notifications
    const unreadCount = notifications.filter(n => !n.isRead).length;

    // This function toggles the dropdown and marks notifications as read when opened
    const handleNotificationsToggle = () => {
        const willBeOpen = !isNotificationsOpen;
        setIsNotificationsOpen(willBeOpen);
        
        // If the dropdown is being opened and there are unread items, mark them as read
        if (willBeOpen && unreadCount > 0) {
            setTimeout(() => {
                markNotificationsAsRead();
            }, 1000); // Small delay to allow dropdown to open before UI update
        }
    };

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
                {/* MODIFIED: The old alerts link is replaced with the new notification system */}
                <div className="notification-area">
                    <button className="notification-btn" onClick={handleNotificationsToggle}>
                        <FaBell />
                        {unreadCount > 0 && (
                            <span className="notification-badge">{unreadCount}</span>
                        )}
                    </button>
                    {isNotificationsOpen && (
                        <div className="notification-dropdown">
                            <div className="notification-header">Notifications</div>
                            <div className="notification-list">
                                {notifications.length > 0 ? (
                                    notifications.map(notif => (
                                        <Link 
                                          to={notif.link || '#'} 
                                          key={notif._id} 
                                          className={`notification-item ${!notif.isRead ? 'unread' : ''}`} 
                                          onClick={() => setIsNotificationsOpen(false)}
                                        >
                                            <p className="notification-message">{notif.message}</p>
                                            <span className="notification-time">
                                                {new Date(notif.createdAt).toLocaleString()}
                                            </span>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="notification-item">
                                        <p className="notification-message">You have no new notifications.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

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
