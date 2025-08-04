// client/src/components/ProtectedRoute.js
import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const ProtectedRoute = () => {
  const { user } = useContext(AuthContext);

  // If there's a user, render the child component (e.g., Dashboard)
  // Otherwise, redirect to the login page
  return user ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;