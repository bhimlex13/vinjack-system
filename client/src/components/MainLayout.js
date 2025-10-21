// client/src/components/MainLayout.js
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

// MUI Imports
import { Box, Toolbar, Container } from '@mui/material'; // <-- Re-added Container

const MainLayout = () => {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    // --- MODIFIED: Added height: '100vh' to prevent double scrollbars ---
    <Box sx={{ display: 'flex', height: '100vh' }}>
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
        }}
      >
        {/* Toolbar acts as a spacer for the fixed AppBar */}
        <Toolbar />
        
        {/* --- THIS IS THE KEY CHANGE --- */}
        {/* The Container now wraps the Outlet, providing consistent layout for all pages */}
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Outlet />
        </Container>

      </Box>
    </Box>
  );
};

export default MainLayout;