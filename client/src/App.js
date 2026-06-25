// client/src/App.js
import React, { useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, default as AuthContext } from './context/AuthContext';
import { ConfirmationProvider } from './context/ConfirmationContext';
import { WarningProvider } from './context/WarningContext';

import WarningModal from './components/WarningModal';
import ForceChangePasswordModal from './components/ForceChangePasswordModal';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import { CircularProgress, Typography } from '@mui/material';
import LoginPage from './pages/LoginPage';
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
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import CreatePurchaseOrderPage from './pages/CreatePurchaseOrderPage';
import PurchaseOrderDetailPage from './pages/PurchaseOrderDetailPage';
import DeliveriesPage from './pages/DeliveriesPage';
import CustomersPage from './pages/CustomersPage';
import ReturnsPage from './pages/ReturnsPage';
import SupplierPOReviewPage from './pages/SupplierPOReviewPage';
import SupplierReturnsPage from './pages/SupplierReturnsPage';
import ConsignmentPayoutsPage from './pages/ConsignmentPayoutsPage';


const InnerApp = () => {
  const { user, mustChangePassword, isInitializing } = useContext(AuthContext);

  useEffect(() => {
    if (!isInitializing && user) {
      const restoreFlag = localStorage.getItem('restoreCompleted');
      if (restoreFlag === 'true') {
        toast.success('System successfully restored from backup.', {
          position: "top-center",
          autoClose: 6000, 
        });
        localStorage.removeItem('restoreCompleted'); 
      }
    }
  }, [user, isInitializing]); 

  if (isInitializing) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 3, color: 'text.secondary', fontWeight: 500 }}>
          Initializing...
        </Typography>
      </div>
    );
  }

  return (
    <Router>
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/supplier/po/:token" element={<SupplierPOReviewPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="/purchase-orders/new" element={<CreatePurchaseOrderPage />} />
            <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/deliveries" element={<DeliveriesPage />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/user-management" element={<UserManagementPage />} />
            <Route path="/data-management" element={<DataManagementPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/returns" element={<ReturnsPage />} />
            <Route path="/supplier-returns" element={<SupplierReturnsPage />} />
            <Route path="/consignment-payouts" element={<ConsignmentPayoutsPage />} />

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