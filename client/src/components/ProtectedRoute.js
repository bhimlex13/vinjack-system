// client/src/components/ProtectedRoute.js
import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const ProtectedRoute = () => {
  // MODIFIED: Get the isInitializing flag from the context
  const { user, isInitializing } = useContext(AuthContext);

  // ADDED: New loading check
  // If the app is still checking for the user, show a loading screen.
  // This prevents the premature redirect.
  if (isInitializing) {
    return <div>Loading...</div>; // Or a spinner component
  }

  // This part now only runs AFTER the initialization is complete
  return user ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;