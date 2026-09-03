import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { LandingPage } from '../pages/public/LandingPage';
import { LoginPage } from '../pages/public/LoginPage';
import { RegisterPage } from '../pages/public/RegisterPage';
import { TrackPage } from '../pages/public/TrackPage';
import { AboutPage } from '../pages/public/AboutPage';
import { ContactPage } from '../pages/public/ContactPage';
import { ShippingRatePage } from '../pages/public/ShippingRatePage';
import { ForgotPasswordPage } from '../pages/public/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/public/ResetPasswordPage';

import { ShipmentListPage } from '../pages/shipments/ShipmentListPage';
import { CreateShipmentPage } from '../pages/shipments/CreateShipmentPage';
import { ShipmentDetailPage } from '../pages/shipments/ShipmentDetailPage';
import { AddressBookPage } from '../pages/account/AddressBookPage';
import { ProfilePage } from '../pages/account/ProfilePage';
import { CustomerReturnsPage } from '../pages/returns/CustomerReturnsPage';
import { RiderDashboardPage } from '../pages/partner/RiderDashboardPage';
import { AdminOperationsPage } from '../pages/admin/AdminOperationsPage';

import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '@courier/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
          <p className="text-xs text-slate-500 font-medium">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const defaultRolePath =
      user.role === 'ADMIN' || user.role === 'OPERATIONS'
        ? '/admin/dashboard'
        : user.role === 'DELIVERY_PARTNER'
        ? '/partner/dashboard'
        : '/my-shipments';

    return <Navigate to={defaultRolePath} replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/shipping-rate" element={<ShippingRatePage />} />
        <Route path="/track" element={<TrackPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      {/* Authenticated Workspace Routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Customer & Seller Views */}
        <Route path="/my-shipments" element={<ShipmentListPage />} />
        <Route path="/create-shipment" element={<CreateShipmentPage />} />
        <Route path="/shipments/:id" element={<ShipmentDetailPage />} />
        <Route path="/returns" element={<CustomerReturnsPage />} />
        <Route path="/addresses" element={<AddressBookPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* Rider Portal */}
        <Route
          path="/partner/dashboard"
          element={
            <ProtectedRoute allowedRoles={['DELIVERY_PARTNER', 'ADMIN']}>
              <RiderDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Admin & Operations Control Center */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'OPERATIONS']}>
              <AdminOperationsPage />
            </ProtectedRoute>
          }
        />

        {/* Legacy redirects */}
        <Route path="/customer/dashboard" element={<Navigate to="/my-shipments" replace />} />
        <Route path="/seller/dashboard" element={<Navigate to="/my-shipments" replace />} />
        <Route path="/operations/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/delivery/dashboard" element={<Navigate to="/partner/dashboard" replace />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
