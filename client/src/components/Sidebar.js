// client/src/components/Sidebar.js
import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

// MUI Imports
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Typography, Divider, Box, IconButton, ListSubheader
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

// React Icons
import {
  FaTachometerAlt, FaBoxOpen, FaShoppingCart, FaTruck, FaChartBar,
  FaUsersCog, FaDatabase, FaFileAlt, FaReceipt, FaFileInvoice,
  FaTruckLoading // <-- FaTools icon removed from this list
} from 'react-icons/fa';

const drawerWidth = 250;

const StyledDrawer = styled(Drawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    '& .MuiDrawer-paper': {
      position: 'relative',
      whiteSpace: 'nowrap',
      width: drawerWidth,
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
      boxSizing: 'border-box',
      ...(!open && {
        overflowX: 'hidden',
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        width: theme.spacing(7),
        [theme.breakpoints.up('sm')]: {
          width: theme.spacing(9),
        },
      }),
    },
  }),
);

const NavListItem = ({ to, icon, text, isCollapsed }) => (
  <ListItem disablePadding component={NavLink} to={to}
    style={({ isActive }) => ({
      textDecoration: 'none',
      color: 'inherit',
      backgroundColor: isActive ? 'rgba(0, 123, 255, 0.1)' : 'transparent',
    })}
  >
    <ListItemButton sx={{ pl: isCollapsed ? 2.5 : 3 }}>
      <ListItemIcon sx={{ minWidth: 0, mr: isCollapsed ? 'auto' : 3, justifyContent: 'center' }}>
        {icon}
      </ListItemIcon>
      <ListItemText primary={text} sx={{ opacity: isCollapsed ? 0 : 1 }} />
    </ListItemButton>
  </ListItem>
);

const Sidebar = ({ isCollapsed, toggleSidebar }) => {
  const { user } = useContext(AuthContext);

  const mainNav = [
    { text: 'Dashboard', to: '/dashboard', icon: <FaTachometerAlt /> },
    { text: 'Sales (POS)', to: '/sales', icon: <FaShoppingCart /> },
  ];

  const managementNav = [
    { text: 'Inventory', to: '/inventory', icon: <FaBoxOpen /> },
    { text: 'Purchase Orders', to: '/purchase-orders', icon: <FaFileInvoice /> },
    { text: 'Suppliers', to: '/suppliers', icon: <FaTruck /> },
    { text: 'Deliveries', to: '/deliveries', icon: <FaTruckLoading /> },
    { text: 'Reports', to: '/reports', icon: <FaChartBar /> },
    { text: 'Transactions', to: '/transactions', icon: <FaReceipt /> },
  ];

  const adminNav = [
    { text: 'User Management', to: '/user-management', icon: <FaUsersCog /> },
    { text: 'Data Management', to: '/data-management', icon: <FaDatabase /> },
    { text: 'Audit Log', to: '/audit-log', icon: <FaFileAlt /> },
  ];

  return (
    <StyledDrawer variant="permanent" open={!isCollapsed}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', px: [1] }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 'auto', pl: 1 }}>
          <img src="/assets/vinjack_logo.png" alt="VinJack Logo" style={{ width: 40, height: 40, marginRight: 12 }} />
          <Typography component="h1" variant="h6" noWrap>VinJack MS</Typography>
        </Box>
        <IconButton onClick={toggleSidebar}><ChevronLeftIcon /></IconButton>
      </Toolbar>
      <Divider />
      <List component="nav">
        <ListSubheader component="div" inset sx={{ opacity: isCollapsed ? 0 : 1 }}>Main</ListSubheader>
        {mainNav.map(item => <NavListItem key={item.text} {...item} isCollapsed={isCollapsed} />)}
        
        <Divider sx={{ my: 1 }} />
        <ListSubheader component="div" inset sx={{ opacity: isCollapsed ? 0 : 1 }}>Management</ListSubheader>
        {managementNav.map(item => <NavListItem key={item.text} {...item} isCollapsed={isCollapsed} />)}

        {user && user.role === 'Owner' && (
          <>
            <Divider sx={{ my: 1 }} />
            <ListSubheader component="div" inset sx={{ opacity: isCollapsed ? 0 : 1 }}>Administration</ListSubheader>
            {adminNav.map(item => <NavListItem key={item.text} {...item} isCollapsed={isCollapsed} />)}
          </>
        )}
      </List>
    </StyledDrawer>
  );
};

export default Sidebar;