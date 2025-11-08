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
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'; // <-- NEW Icon

// React Icons
import {
  FaTachometerAlt, FaBoxOpen, FaShoppingCart, FaTruck, FaChartBar,
  FaUsersCog, FaDatabase, FaFileAlt, FaReceipt, FaFileInvoice,
  FaTruckLoading, FaUserFriends, FaUndo
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
  // --- UPDATED: Get 'user' and 'hasPermission' from context ---
  const { user, hasPermission } = useContext(AuthContext);

  // --- UPDATED: All nav items are now defined with permission checks ---
  const mainNav = [
    { text: 'Dashboard', to: '/dashboard', icon: <FaTachometerAlt />, perm: hasPermission('canViewDashboard') },
  ];
  
  const salesNav = [
    { text: 'Sales (POS)', to: '/sales', icon: <FaShoppingCart />, perm: hasPermission('canManageSales') },
    { text: 'Customers', to: '/customers', icon: <FaUserFriends />, perm: hasPermission('canManageCustomers') },
    { text: 'Returns', to: '/returns', icon: <FaUndo />, perm: hasPermission('canManageReturns') },
  ];

  const inventoryNav = [
    { text: 'Inventory', to: '/inventory', icon: <FaBoxOpen />, perm: hasPermission('canViewInventory') }
  ];

  const purchasingNav = [
    { text: 'Deliveries', to: '/deliveries', icon: <FaTruckLoading />, perm: hasPermission('canManageDeliveries') },
    { text: 'Purchase Orders', to: '/purchase-orders', icon: <FaFileInvoice />, perm: hasPermission('canManagePurchaseOrders') },
    { text: 'Suppliers', to: '/suppliers', icon: <FaTruck />, perm: hasPermission('canViewSuppliers') },
  ];

  const reportingNav = [
    { text: 'Reports', to: '/reports', icon: <FaChartBar />, perm: hasPermission('canViewReports') },
    { text: 'Transactions', to: '/transactions', icon: <FaReceipt />, perm: hasPermission('canViewReports') }, // Also tied to reports
  ];

  const adminNav = [
    { text: 'User Management', to: '/user-management', icon: <FaUsersCog />, perm: true }, // Only Super Admin sees this section
    { text: 'Data Management', to: '/data-management', icon: <FaDatabase />, perm: true }, // Only Super Admin sees this section
    { text: 'Audit Log', to: '/audit-log', icon: <FaFileAlt />, perm: true }, // Only Super Admin sees this section
    // --- NEW: Link to Permission Management Page ---
    { text: 'Permissions', to: '/permissions', icon: <AdminPanelSettingsIcon />, perm: true }, // Only Super Admin sees this section
  ];
  // --- END UPDATES ---

  // Helper to filter nav items based on permissions
  const renderNav = (items) => {
    return items
      .filter(item => item.perm) // <-- Only include items where perm is true
      .map(item => <NavListItem key={item.text} {...item} isCollapsed={isCollapsed} />);
  };

  const renderedMainNav = renderNav(mainNav);
  const renderedSalesNav = renderNav(salesNav);
  const renderedInventoryNav = renderNav(inventoryNav);
  const renderedPurchasingNav = renderNav(purchasingNav);
  const renderedReportingNav = renderNav(reportingNav);
  const renderedAdminNav = renderNav(adminNav);


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

        {renderedMainNav.length > 0 && (
          <>
            <ListSubheader component="div" inset sx={{ opacity: isCollapsed ? 0 : 1 }}>Main</ListSubheader>
            {renderedMainNav}
          </>
        )}
        
        {renderedSalesNav.length > 0 && (
          <>
            <ListSubheader component="div" inset sx={{ opacity: isCollapsed ? 0 : 1, lineHeight: '30px', mt: 1 }}>Sales</ListSubheader>
            {renderedSalesNav}
          </>
        )}
        
        {/* --- UPDATED: Combined Inventory & Purchasing into one Management section --- */}
        {(renderedInventoryNav.length > 0 || renderedPurchasingNav.length > 0) && (
          <>
            <Divider sx={{ my: 1 }} />
            <ListSubheader component="div" inset sx={{ opacity: isCollapsed ? 0 : 1 }}>Management</ListSubheader>
            {renderedInventoryNav}
            {renderedPurchasingNav}
          </>
        )}

        {renderedReportingNav.length > 0 && (
          <>
            <ListSubheader component="div" inset sx={{ opacity: isCollapsed ? 0 : 1, lineHeight: '30px', mt: 1 }}>Logs & Reports</ListSubheader>
            {renderedReportingNav}
          </>
        )}

        {/* --- UPDATED: Check for Super Admin role --- */}
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