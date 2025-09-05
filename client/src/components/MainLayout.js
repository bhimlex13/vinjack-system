// client/src/components/MainLayout.js
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

// MUI Imports
import { Box, Container, Toolbar } from '@mui/material';

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
        }}
      >
        {/* Toolbar acts as a spacer for the fixed AppBar */}
        <Toolbar />
        
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          {/* The Outlet renders the current page (e.g., Dashboard, Inventory) */}
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

export default MainLayout;