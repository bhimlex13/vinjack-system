// client/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ConfirmationProvider } from './context/ConfirmationContext';

import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import InventoryPage from './pages/InventoryPage';
import SalesPage from './pages/SalesPage';
import AlertsPage from './pages/AlertsPage';
import SuppliersPage from './pages/SuppliersPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogPage from './pages/AuditLogPage';
import SettingsPage from './pages/SettingsPage';
import UserManagementPage from './pages/UserManagementPage';
import DataManagementPage from './pages/DataManagementPage';

function App() {
  return (
    <AuthProvider>
      <ConfirmationProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegistrationPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/sales" element={<SalesPage />} />
                <Route path="/suppliers" element={<SuppliersPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/audit-log" element={<AuditLogPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/user-management" element={<UserManagementPage />} />
                <Route path="/data-management" element={<DataManagementPage />} /> 
                <Route path="/" element={<Navigate to="/dashboard" />} />
              </Route>
            </Route>
          </Routes>
        </Router>
      </ConfirmationProvider>
    </AuthProvider>
  );
}

export default App;