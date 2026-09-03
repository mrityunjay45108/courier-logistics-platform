import React, { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Truck,
  LayoutDashboard,
  Package,
  MapPin,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  FileText,
  Activity,
  Calculator,
  RotateCcw,
  Bike,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import type { UserRole } from '@courier/types';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadgeVariant = (role?: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'danger';
      case 'SELLER':
        return 'default';
      case 'OPERATIONS':
        return 'warning';
      case 'DELIVERY_PARTNER':
        return 'success';
      default:
        return 'outline';
    }
  };

  const navItems: NavItem[] = [
    // Customer & Seller
    {
      title: 'My Consignments',
      href: '/my-shipments',
      icon: <Package className="h-4 w-4" />,
      allowedRoles: ['CUSTOMER', 'SELLER', 'ADMIN', 'OPERATIONS'],
    },
    {
      title: 'Book Shipment',
      href: '/create-shipment',
      icon: <Truck className="h-4 w-4" />,
      allowedRoles: ['CUSTOMER', 'SELLER', 'ADMIN'],
    },
    {
      title: 'Rate Calculator',
      href: '/shipping-rate',
      icon: <Calculator className="h-4 w-4" />,
    },
    {
      title: 'Returns & Reverse',
      href: '/returns',
      icon: <RotateCcw className="h-4 w-4" />,
      allowedRoles: ['CUSTOMER', 'SELLER', 'ADMIN', 'OPERATIONS'],
    },
    {
      title: 'Saved Addresses',
      href: '/addresses',
      icon: <MapPin className="h-4 w-4" />,
      allowedRoles: ['CUSTOMER', 'SELLER', 'ADMIN'],
    },
    // Rider Portal
    {
      title: 'Rider Portal',
      href: '/partner/dashboard',
      icon: <Bike className="h-4 w-4" />,
      allowedRoles: ['DELIVERY_PARTNER', 'ADMIN'],
    },
    // Admin & Ops
    {
      title: 'Operations Center',
      href: '/admin/dashboard',
      icon: <Shield className="h-4 w-4" />,
      allowedRoles: ['ADMIN', 'OPERATIONS'],
    },
    // General
    {
      title: 'Profile & Security',
      href: '/profile',
      icon: <Settings className="h-4 w-4" />,
    },
  ];

  const visibleNavItems = navItems.filter((item) =>
    !item.allowedRoles || (user && item.allowedRoles.includes(user.role))
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Mobile Nav Header */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-sky-400" />
          <span className="font-bold text-base tracking-tight">Apex Logistics</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1 rounded text-slate-400 hover:text-white"
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-200 transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:inset-auto md:min-h-screen flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-0 max-md:-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-800">
          <div className="h-8 w-8 rounded-lg bg-sky-500 flex items-center justify-center text-white font-bold shadow-md shadow-sky-500/30">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white block leading-tight">
              Apex Express
            </span>
            <span className="text-[10px] text-slate-400 font-medium block">
              Logistics Platform
            </span>
          </div>
        </div>

        {/* User Card */}
        {user && (
          <div className="p-4 mx-3 my-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-white truncate max-w-[130px]">
                {user.name}
              </span>
              <Badge variant={getRoleBadgeVariant(user.role) as any} className="text-[10px] px-1.5 py-0">
                {user.role}
              </Badge>
            </div>
            <span className="text-[11px] text-slate-400 block truncate">{user.email}</span>
          </div>
        )}

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {item.icon}
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto min-h-screen">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
