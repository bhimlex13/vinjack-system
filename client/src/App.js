// client/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import InventoryPage from './pages/InventoryPage'; // <-- ADD THIS IMPORT

// You can keep the other placeholder pages for now
const SalesPage = () => <h1>Sales Page</h1>;
const SuppliersPage = () => <h1>Suppliers Page</h1>;
const ReportsPage = () => <h1>Reports Page</h1>;

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              {/* This now uses your real InventoryPage component */}
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
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