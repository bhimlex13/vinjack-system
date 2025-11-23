// client/src/components/MainLayout.js
import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom'; // Added useLocation
import { AnimatePresence, motion } from 'framer-motion'; // Added Framer Motion imports
import Sidebar from './Sidebar';
import Navbar from './Navbar';

// MUI Imports
import { Box, Toolbar, Container } from '@mui/material';

const MainLayout = () => {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation(); // We need this to identify specific routes for animation keys

  const toggleSidebar = () => {
    setSidebarCollapsed(!isSidebarCollapsed);
  };

  // Define the animation style for page transitions
  const pageVariants = {
    initial: {
      opacity: 0,
      y: 20, // Starts slightly below
    },
    animate: {
      opacity: 1,
      y: 0, // Slides up to natural position
    },
    exit: {
      opacity: 0,
      y: -20, // Fades out slightly upward
    }
  };

  return (
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
        
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* AnimatePresence mode="wait" ensures the old page fades out 
              BEFORE the new page fades in, preventing layout jumps.
            */}
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname} // Unique key tells Framer Motion the page has changed
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageVariants}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
        </Container>

      </Box>
    </Box>
  );
};

export default MainLayout;