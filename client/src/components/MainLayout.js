// client/src/components/MainLayout.js
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

// MUI Imports
import { Box, Toolbar, Container } from '@mui/material';

// Components
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const MainLayout = () => {
  const location = useLocation();
  const theme = useTheme();
  
  // Detect if screen is small (mobile/tablet)
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Sidebar State
  // Desktop: true = expanded, false = collapsed
  // Mobile: true = visible (fullscreen), false = hidden
  const [isSidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Sync state when screen size changes
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  // Define the animation style for page transitions
  const pageVariants = {
    initial: {
      opacity: 0,
      y: 15,
    },
    animate: {
      opacity: 1,
      y: 0,
    },
    exit: {
      opacity: 0,
      y: -15,
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Pass compatible props to Navbar.
        Note: If Navbar strictly expects 'isSidebarCollapsed', we invert the logic.
        Assuming Navbar uses the toggle to flip the state.
      */}
      <Navbar 
        isSidebarCollapsed={!isSidebarOpen} 
        toggleSidebar={toggleSidebar} 
      />
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar} 
      />
      
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
          display: 'flex',
          flexDirection: 'column',
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {/* Toolbar acts as a spacer for the fixed AppBar */}
        <Toolbar />
        
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
            {/* AnimatePresence mode="wait" ensures smooth transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageVariants}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                style={{ width: '100%' }}
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