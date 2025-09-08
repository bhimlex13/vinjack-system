// client/src/components/MainLayout.js
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

// MUI Imports
import { Box, Toolbar } from '@mui/material'; // <-- Container is no longer needed here

const MainLayout = () => {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Navbar isSidebarCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
      <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
      
      <Box
        component="main"
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === 'light'
              ? theme.palette.grey[100]
              : theme.palette.grey[900],
          flexGrow: 1,
          height: '100vh',
          overflow: 'auto',
          p: 3, // <-- ADDED: Consistent padding for all pages
        }}
      >
        {/* Toolbar acts as a spacer for the fixed AppBar */}
        <Toolbar />
        
        {/* --- REMOVED the restrictive Container that was wrapping the Outlet --- */}
        
        {/* The Outlet now renders directly into the full-width Box */}
        <Outlet />

      </Box>
    </Box>
  );
};

export default MainLayout;