// client/src/components/Sidebar.js
import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { motion } from 'framer-motion';

// MUI Imports
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Typography, Divider, Box, IconButton, ListSubheader, useTheme, useMediaQuery
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import CloseIcon from '@mui/icons-material/Close';

// React Icons
import {
  FaTachometerAlt, FaBoxOpen, FaShoppingCart, FaTruck, FaChartBar,
  FaUsersCog, FaDatabase, FaFileAlt, FaReceipt, FaFileInvoice,
  FaTruckLoading, FaUserFriends, FaUndo,
  FaHandHoldingUsd,
  FaTruckMoving 
} from 'react-icons/fa';

const drawerWidth = 260;

// Mixin for opened drawer style
const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
  // --- ADDED: Shadow and removed border for elevation effect ---
  boxShadow: '4px 0 20px rgba(0,0,0,0.08)', 
  borderRight: 'none',
  // -----------------------------------------------------------
});

// Mixin for closed drawer style
const closedMixin = (theme) => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
  // --- ADDED: Shadow and removed border for elevation effect ---
  boxShadow: '4px 0 20px rgba(0,0,0,0.08)',
  borderRight: 'none',
  // -----------------------------------------------------------
});

const DesktopDrawer = styled(Drawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(open && {
      ...openedMixin(theme),
      '& .MuiDrawer-paper': openedMixin(theme),
    }),
    ...(!open && {
      ...closedMixin(theme),
      '& .MuiDrawer-paper': closedMixin(theme),
    }),
  }),
);

// Animated List Item Component
const NavListItem = ({ to, icon, text, isOpen, isMobile, toggleSidebar }) => (
  <ListItem disablePadding sx={{ display: 'block', mb: 0.5 }}>
    <ListItemButton
      component={NavLink}
      to={to}
      onClick={isMobile ? toggleSidebar : undefined}
      sx={{
        minHeight: 48,
        justifyContent: isOpen ? 'initial' : 'center',
        px: 2.5,
        mx: 1,
        borderRadius: 2,
        transition: 'all 0.3s ease',
        '&.active': {
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          boxShadow: '0 4px 12px 0 rgba(0,0,0,0.2)', // Added shadow to active button too
          '& .MuiListItemIcon-root': {
            color: 'inherit',
          },
        },
        '&:hover': {
          backgroundColor: 'action.hover', 
          transform: 'translateX(3px)',
        },
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: 0,
          mr: isOpen ? 2 : 'auto',
          justifyContent: 'center',
          color: 'text.secondary',
          fontSize: '1.3rem',
        }}
      >
        {icon}
      </ListItemIcon>
      <ListItemText 
        primary={text} 
        primaryTypographyProps={{ 
          fontSize: '0.95rem', 
          fontWeight: 500,
          letterSpacing: '0.3px'
        }}
        sx={{ opacity: isOpen ? 1 : 0 }} 
      />
    </ListItemButton>
  </ListItem>
);

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, hasPermission } = useContext(AuthContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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

  const renderNavGroup = (items, title) => {
    const filteredItems = items.filter(item => item.perm);
    if (filteredItems.length === 0) return null;

    return (
      <Box sx={{ mb: 1 }}>
        {isOpen && title && (
          <ListSubheader 
            component="div" 
            sx={{ 
              backgroundColor: 'transparent',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              fontWeight: 'bold',
              color: 'text.disabled',
              mt: 2,
              mb: 0.5,
              lineHeight: '20px'
            }}
          >
            {title}
          </ListSubheader>
        )}
        {!isOpen && title && <Divider sx={{ my: 1, opacity: 0.5 }} />}
        
        {filteredItems.map(item => (
          <NavListItem 
            key={item.text} 
            {...item} 
            isOpen={isOpen} 
            isMobile={isMobile}
            toggleSidebar={toggleSidebar}
          />
        ))}
      </Box>
    );
  };

  const drawerContent = (
    <>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: [2] }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <motion.img 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            src="/assets/vinjack_logo.png" 
            alt="VinJack Logo" 
            style={{ width: 35, height: 35, marginRight: 12 }} 
          />
          {isOpen && (
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700, letterSpacing: '-0.5px' }}>
              VinJack MS
            </Typography>
          )}
        </Box>
        <IconButton onClick={toggleSidebar}>
          {isMobile ? <CloseIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Toolbar>
      <Divider />
      
      <List component="nav" sx={{ px: 1, pb: 4 }}>
        {renderNavGroup(mainNav, '')}
        {renderNavGroup(salesNav, 'Sales')}
        {renderNavGroup(managementNav, 'Inventory & Supply')}
        {renderNavGroup(reportingNav, 'Reports')}
        {renderNavGroup(adminNav, 'Admin')}
      </List>
    </>
  );

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={isOpen}
        onClose={toggleSidebar}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: '100%', 
            maxWidth: '100%' 
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <DesktopDrawer variant="permanent" open={isOpen} sx={{ display: { xs: 'none', md: 'block' } }}>
      {drawerContent}
    </DesktopDrawer>
  );
};

export default Sidebar;