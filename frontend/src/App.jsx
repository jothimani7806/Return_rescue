import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Customer Pages
import CustomerDashboard from './pages/customer/CustomerDashboard';
import SubmitReturnWizard from './pages/customer/SubmitReturnWizard';
import CustomerReturnDetail from './pages/customer/CustomerReturnDetail';

// Manager Pages
import ManagerDashboard from './pages/manager/ManagerDashboard';
import ReturnQueue from './pages/manager/ReturnQueue';
import ReturnInspection from './pages/manager/ReturnInspection';
import InventoryPage from './pages/manager/InventoryPage';
import DatasetManagement from './pages/manager/DatasetManagement';
import CategoryAdmin from './pages/manager/CategoryAdmin';

function ProtectedRoute({ children, requiredRole = null }) {
  const { user, loading, isManager } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c16] flex items-center justify-center text-slate-400 text-sm">
        Initializing Universal Return Rescue...
      </div>
    );
  }

  if (!user) {
    const loginTarget = requiredRole === 'manager' ? '/manager/login' : '/login';
    return <Navigate to={loginTarget} replace />;
  }

  if (requiredRole === 'manager' && !isManager) {
    return (
      <div className="min-h-screen bg-[#080c16] flex items-center justify-center p-6 text-center">
        <div className="max-w-md p-8 rounded-3xl glass-panel border border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto text-xl">
            🔒
          </div>
          <h3 className="text-lg font-bold text-white">Manager Portal Access Required</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            You are currently signed in as customer <span className="text-indigo-400 font-semibold">{user.username}</span>.
            Manager permissions are strictly enforced on this view.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              to="/customer/dashboard"
              className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-glow-brand transition-all inline-block"
            >
              Go to Customer Dashboard
            </Link>
            <Link
              to="/manager/login"
              className="py-2 px-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs transition-colors inline-block"
            >
              Sign in with Manager Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

function RootRedirect() {
  const { user, loading, isManager } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c16] flex items-center justify-center text-slate-400 text-sm">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isManager) {
    return <Navigate to="/manager/dashboard" replace />;
  }

  return <Navigate to="/customer/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth - Supports Unified, Customer-direct, and Manager-direct */}
          <Route path="/login" element={<Login />} />
          <Route path="/customer/login" element={<Login initialPortal="customer" />} />
          <Route path="/manager/login" element={<Login initialPortal="manager" />} />
          <Route path="/register" element={<Register />} />

          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Protected App Layout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Customer Routes */}
            <Route path="/customer/dashboard" element={<CustomerDashboard />} />
            <Route path="/customer/submit" element={<SubmitReturnWizard />} />
            <Route path="/customer/return/:id" element={<CustomerReturnDetail />} />

            {/* Manager Routes */}
            <Route
              path="/manager/dashboard"
              element={
                <ProtectedRoute requiredRole="manager">
                  <ManagerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/returns"
              element={
                <ProtectedRoute requiredRole="manager">
                  <ReturnQueue />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/inspect/:id"
              element={
                <ProtectedRoute requiredRole="manager">
                  <ReturnInspection />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/inventory"
              element={
                <ProtectedRoute requiredRole="manager">
                  <InventoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/datasets"
              element={
                <ProtectedRoute requiredRole="manager">
                  <DatasetManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/catalog"
              element={
                <ProtectedRoute requiredRole="manager">
                  <CategoryAdmin />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
