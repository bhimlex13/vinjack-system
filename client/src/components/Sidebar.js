// client/src/components/Sidebar.js
import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion'; // --- NEW IMPORT ---

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
  FaTruckLoading, FaUserFriends, FaUndo,
  FaHandHoldingUsd,
  FaTruckMoving 
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

// --- MODIFIED: Wrapped ListItem in motion.div ---
const NavListItem = ({ to, icon, text, isCollapsed }) => (
  <motion.div
    layout
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3 }}
  >
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
  </motion.div>
);

const Sidebar = ({ isCollapsed, toggleSidebar }) => {
  const { user, hasPermission } = useContext(AuthContext);

  const mainNav = [
    { text: 'Dashboard', to: '/dashboard', icon: <FaTachometerAlt />, perm: hasPermission('canViewDashboard') },
  ];
  
  const salesNav = [
    { text: 'Sales (POS)', to: '/sales', icon: <FaShoppingCart />, perm: hasPermission('canManageSales') },
    { text: 'Customers', to: '/customers', icon: <FaUserFriends />, perm: hasPermission('canManageCustomers') },
    { text: 'Returns', to: '/returns', icon: <FaUndo />, perm: hasPermission('canManageReturns') },
  ];

  const managementNav = [
    { text: 'Inventory', to: '/inventory', icon: <FaBoxOpen />, perm: hasPermission('canViewInventory') },
    { text: 'Deliveries', to: '/deliveries', icon: <FaTruckLoading />, perm: hasPermission('canManageDeliveries') },
    { text: 'Purchase Orders', to: '/purchase-orders', icon: <FaFileInvoice />, perm: hasPermission('canManagePurchaseOrders') },
    { text: 'Suppliers', to: '/suppliers', icon: <FaTruck />, perm: hasPermission('canViewSuppliers') },
    { text: 'Supplier Returns', to: '/supplier-returns', icon: <FaTruckMoving />, perm: hasPermission('canManageSuppliers') },
    { text: 'Consignment Payouts', to: '/consignment-payouts', icon: <FaHandHoldingUsd />, perm: hasPermission('canManageSuppliers') },
  ];

  const reportingNav = [
    { text: 'Reports', to: '/reports', icon: <FaChartBar />, perm: hasPermission('canViewReports') },
    { text: 'Transactions', to: '/transactions', icon: <FaReceipt />, perm: hasPermission('canViewReports') },
    { text: 'Audit Log', to: '/audit-log', icon: <FaFileAlt />, perm: user && user.role === 'Super Admin' },
  ];

  const adminNav = [
    { text: 'User Management', to: '/user-management', icon: <FaUsersCog />, perm: true },
    { text: 'Data Management', to: '/data-management', icon: <FaDatabase />, perm: true },
  ];

  const renderNav = (items) => {
    return items
      .filter(item => item.perm) 
      .map(item => <NavListItem key={item.text} {...item} isCollapsed={isCollapsed} />);
  };

  const renderedMainNav = renderNav(mainNav);
  const renderedSalesNav = renderNav(salesNav);
  const renderedManagementNav = renderNav(managementNav);
  const renderedReportingNav = renderNav(reportingNav);
  const renderedAdminNav = renderNav(adminNav);


  return (
    <StyledDrawer variant="permanent" open={!isCollapsed}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', px: [1] }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 'auto', pl: 1 }}>
          {/* --- ANIMATED LOGO --- */}
          <motion.img 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            src="/assets/vinjack_logo.png" 
            alt="VinJack Logo" 
            style={{ width: 40, height: 40, marginRight: 12 }} 
          />
          <Typography component="h1" variant="h6" noWrap>VinJack MS</Typography>
        </Box>
        <IconButton onClick={toggleSidebar}><ChevronLeftIcon /></IconButton>
      </Toolbar>
      <Divider />
      <List component="nav">

        {renderedMainNav.length > 0 && (
          <>
            <ListSubheader component="div" inset sx={{ opacity: isCollapsed ? 0 : 1 }}>Dashboard</ListSubheader>
            {renderedMainNav}
          </>
        )}
        
        {renderedSalesNav.length > 0 && (
          <>
            <ListSubheader component="div" inset sx={{ opacity: isCollapsed ? 0 : 1, lineHeight: '30px', mt: 1 }}>Sales</ListSubheader>
            {renderedSalesNav}
          </>
        )}
        
        {renderedManagementNav.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <ListSubheader component="div" inset sx={{ opacity: isCollapsed ? 0 : 1 }}>Inventory & Suppliers</ListSubheader>
            {renderedManagementNav}
          </>
        )}

        {renderedReportingNav.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <ListSubheader component="div" inset sx={{ opacity: isCollapsed ? 0 : 1 }}>Reports & Logs</ListSubheader>
            {renderedReportingNav}
          </>
        )}

        {user && user.role === 'Super Admin' && (
          <>
            <Divider sx={{ my: 1 }} />
            <ListSubheader component="div" inset sx={{ opacity: isCollapsed ? 0 : 1 }}>Administration</ListSubheader>
            {renderedAdminNav}
          </>
        )}
      </List>
    </StyledDrawer>
  );
};

export default Sidebar;