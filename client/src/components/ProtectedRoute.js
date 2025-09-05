// client/src/components/ProtectedRoute.js
import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

// MUI Imports
import { Box, CircularProgress } from '@mui/material';

const ProtectedRoute = () => {
  const { user, isInitializing } = useContext(AuthContext);

  // If the app is still checking for the user, show a centered spinner.
  if (isInitializing) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // This part now only runs AFTER the initialization is complete
  return user ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;