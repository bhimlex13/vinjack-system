// client/src/components/Navbar.js
import React, { useState, useContext } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

// MUI Imports
import {
  AppBar as MuiAppBar, Toolbar, IconButton, Typography, Box, Badge, Menu, MenuItem, Tooltip, Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircle from '@mui/icons-material/AccountCircle';
import Settings from '@mui/icons-material/Settings';
import Logout from '@mui/icons-material/Logout';

const drawerWidth = 250;

// Custom styled AppBar to handle width transitions with the Sidebar
const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const Navbar = ({ isSidebarCollapsed, toggleSidebar }) => {
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState(null);
  
  const { user, logout, notifications, markNotificationsAsRead } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleUserMenuOpen = (event) => setUserMenuAnchorEl(event.currentTarget);
  const handleUserMenuClose = () => setUserMenuAnchorEl(null);

  const handleNotificationsOpen = (event) => {
    setNotificationsAnchorEl(event.currentTarget);
    if (unreadCount > 0) {
      setTimeout(() => markNotificationsAsRead(), 1000);
    }
  };
  const handleNotificationsClose = () => setNotificationsAnchorEl(null);
  
  const handleLogout = () => {
    handleUserMenuClose();
    logout();
    navigate('/login');
  };

  const getPageTitle = (pathname) => {
    if (pathname === '/dashboard' || pathname === '/') return 'Dashboard';
    const name = pathname.split('/').pop().replace(/-/g, ' ');
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <AppBar position="absolute" open={!isSidebarCollapsed}>
      <Toolbar sx={{ pr: '24px' }}>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="open drawer"
          onClick={toggleSidebar}
          sx={{
            marginRight: '36px',
            ...( !isSidebarCollapsed && { display: 'none' }),
          }}
        >
          <MenuIcon />
        </IconButton>
        <Typography
          component="h1"
          variant="h6"
          color="inherit"
          noWrap
          sx={{ flexGrow: 1 }}
        >
          {getPageTitle(location.pathname)}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title="Notifications">
            <IconButton color="inherit" onClick={handleNotificationsOpen}>
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Account settings">
            <IconButton onClick={handleUserMenuOpen} color="inherit">
              <AccountCircle />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>

      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationsAnchorEl}
        open={Boolean(notificationsAnchorEl)}
        onClose={handleNotificationsClose}
        PaperProps={{ sx: { maxHeight: 400, width: '350px' } }}
      >
        <Typography variant="h6" sx={{ p: 2 }}>Notifications</Typography>
        <Divider />
        {notifications.length > 0 ? (
          notifications.map(notif => (
            <MenuItem 
              key={notif._id} 
              onClick={() => {
                handleNotificationsClose();
                if(notif.link) navigate(notif.link);
              }}
              sx={{ whiteSpace: 'normal', fontWeight: !notif.isRead ? 'bold' : 'normal' }}
            >
              <Box>
                <Typography variant="body2">{notif.message}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(notif.createdAt).toLocaleString()}
                </Typography>
              </Box>
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>You have no new notifications.</MenuItem>
        )}
      </Menu>

      {/* User Account Menu */}
      <Menu
        anchorEl={userMenuAnchorEl}
        open={Boolean(userMenuAnchorEl)}
        onClose={handleUserMenuClose}
      >
        <MenuItem disabled>
          <Typography fontWeight="bold">{user?.fullName || 'User'}</Typography>
        </MenuItem>
        <Divider />
        <MenuItem component={RouterLink} to="/settings" onClick={handleUserMenuClose}>
          <Settings fontSize="small" sx={{ mr: 1.5 }} /> Settings
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <Logout fontSize="small" sx={{ mr: 1.5 }} /> Logout
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default Navbar;