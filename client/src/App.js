// client/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import InventoryPage from './pages/InventoryPage';
import SalesPage from './pages/SalesPage';
import AlertsPage from './pages/AlertsPage'; 
import ReportsPage from './pages/ReportsPage'; 
import SuppliersPage from './pages/SuppliersPage'; 


function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/alerts" element={<AlertsPage />} /> {/* <-- This now uses your real component */}
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;