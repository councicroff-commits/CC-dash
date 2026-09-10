import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Auth Utility (Adjusted path for src/app/ location)
import { isAuthenticated } from '../utils/auth';

// Layouts & Authentication Pages
import DashboardLayout from '../layouts/DashboardLayout';
import LoginPage from '../pages/LoginPage';

// Core Pages
import Home from '../pages/Home';
import Dashboard from '../pages/Dashboard';
import Analytics from '../pages/Analytics';
import Users from '../pages/Users';
import UserDetail from '../pages/UserDetail';
import Settings from '../pages/Settings';
import Promos from '../pages/Promos';
import Parts from '../pages/Parts';

// Product Management Pages
import ProductList from '../pages/ProductList';
import ProductForm from '../pages/ProductForm';
import ProductDetail from '../pages/ProductDetail';

// Order Management Pages
import OrderList from '../pages/OrderList';
import OrderDetails from '../pages/OrderDetails';

// ==========================================
// PROTECTED ROUTE WRAPPER
// ==========================================
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const location = useLocation();
  const [isAuth, setIsAuth] = useState<boolean>(isAuthenticated());

  useEffect(() => {
    // Validate session expiry timestamp on route changes and hard refreshes
    if (!isAuthenticated()) {
      setIsAuth(false);
    }
  }, [location]);

  if (!isAuth) {
    // Preserve attempted URL location for redirect post-login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// ==========================================
// PRODUCTION APP ROUTER
// ==========================================
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Authentication Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Admin Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Index fallback → Home */}
        <Route index element={<Home />} />

        {/* Core Pages */}
        <Route path="home" element={<Home />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="promos" element={<Promos />} />
        <Route path="settings" element={<Settings />} />
        <Route path="dashboard/parts" element={<Parts />} />
        <Route path="parts" element={<Parts />} />

        {/* Product Management */}
        <Route path="dashboard/products" element={<ProductList />} />
        <Route path="dashboard/products/new" element={<ProductForm />} />
        <Route path="dashboard/products/edit/:id" element={<ProductForm />} />
        <Route path="dashboard/products/:id" element={<ProductDetail />} />

        {/* Order Management */}
        <Route path="dashboard/orders" element={<OrderList />} />
        <Route path="dashboard/orders/:id" element={<OrderDetails />} />

        {/* Users Management */}
        <Route path="users" element={<Users />} />
        <Route path="users/:id" element={<UserDetail />} />
      </Route>

      {/* Global Fallback Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
