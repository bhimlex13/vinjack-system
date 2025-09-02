// client/src/App.js
import React, { useContext } from 'react'; // MODIFIED: Added useContext
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, default as AuthContext } from './context/AuthContext'; // MODIFIED: Imported AuthContext
import { ConfirmationProvider } from './context/ConfirmationContext';
import { WarningProvider } from './context/WarningContext';

import WarningModal from './components/WarningModal';
import ForceChangePasswordModal from './components/ForceChangePasswordModal'; // ADDED: Import the new modal
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';

import LoginPage from './pages/LoginPage';
// import RegistrationPage from './pages/RegistrationPage'; // REMOVED: No longer needed
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import SalesPage from './pages/SalesPage';
import AlertsPage from './pages/AlertsPage';
import SuppliersPage from './pages/SuppliersPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogPage from './pages/AuditLogPage';
import SettingsPage from './pages/SettingsPage';
import UserManagementPage from './pages/UserManagementPage';
import DataManagementPage from './pages/DataManagementPage';
import TransactionsPage from './pages/TransactionsPage';


// This InnerApp component handles the logic after AuthProvider is initialized
const InnerApp = () => {
  const { user, mustChangePassword, isInitializing } = useContext(AuthContext);

  if (isInitializing) {
    return <div className="loading">Loading Application...</div>;
  }

  return (
    <Router>
      {/* ADDED: Conditionally render the password change modal as an overlay */}
      {user && mustChangePassword && <ForceChangePasswordModal />}

      <WarningModal />
      <ToastContainer
        position="top-right"
        autoClose={3500}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        {/* REMOVED: The public registration route is no longer part of the workflow */}
        {/* <Route path="/register" element={<RegistrationPage />} /> */}

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/user-management" element={<UserManagementPage />} />
            <Route path="/data-management" element={<DataManagementPage />} /> 
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}


function App() {
  return (
    <WarningProvider>
      <AuthProvider>
        <ConfirmationProvider>
          <InnerApp />
        </ConfirmationProvider>
      </AuthProvider>
    </WarningProvider>
  );
}

export default App;