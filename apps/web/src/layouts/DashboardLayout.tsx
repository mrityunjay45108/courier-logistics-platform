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
  UserCheck,
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
        return 'destructive';
      case 'SELLER':
        return 'default';
      case 'OPERATIONS':
        return 'warning';
      case 'DELIVERY_PARTNER':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const navItems: NavItem[] = [
    // Customer
    {
      title: 'Customer Dashboard',
      href: '/customer/dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
      allowedRoles: ['CUSTOMER', 'ADMIN'],
    },
    // Seller
    {
      title: 'Seller Dashboard',
      href: '/seller/dashboard',
      icon: <Package className="h-4 w-4" />,
      allowedRoles: ['SELLER', 'ADMIN'],
    },
    // Admin
    {
      title: 'Admin Console',
      href: '/admin/dashboard',
      icon: <Shield className="h-4 w-4" />,
      allowedRoles: ['ADMIN'],
    },
    // Operations
    {
      title: 'Hub Operations',
      href: '/operations/dashboard',
      icon: <Activity className="h-4 w-4" />,
      allowedRoles: ['OPERATIONS', 'ADMIN'],
    },
    // Delivery Partner
    {
      title: 'Delivery Run-sheets',
      href: '/delivery/dashboard',
      icon: <MapPin className="h-4 w-4" />,
      allowedRoles: ['DELIVERY_PARTNER', 'ADMIN'],
    },
  ];

  // Filter items applicable to this user
  const visibleNavItems = navItems.filter((item) =>
    !item.allowedRoles || (user && item.allowedRoles.includes(user.role))
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-slate-200">
        <Link to="/" className="flex items-center gap-2 font-bold text-slate-900">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Truck className="h-4 w-4" />
          </div>
          <span>Apex Logistics</span>
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Toggle navigation menu"
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar for Desktop & Mobile Slide-over */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-white tracking-tight">
            <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
              <Truck className="h-4 w-4" />
            </div>
            <span>Apex Logistics</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Role Indicator */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-400">CURRENT SESSION</span>
            <Badge variant={getRoleBadgeVariant(user?.role)}>
              {user?.role || 'GUEST'}
            </Badge>
          </div>
          <div className="font-medium text-sm text-white truncate">{user?.name || 'Authorized User'}</div>
          <div className="text-xs text-slate-400 truncate">{user?.email}</div>
        </div>

        {/* Navigation items */}
        <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Workspaces
          </div>
          {visibleNavItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.title}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.title}</span>
              </Link>
            );
          })}

          <div className="pt-4 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Public Quick Links
          </div>
          <Link
            to="/track"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <Package className="h-3.5 w-3.5" /> Track Consignment
          </Link>
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <Truck className="h-3.5 w-3.5" /> Platform Homepage
          </Link>
        </div>

        {/* Logout CTA */}
        <div className="p-4 border-t border-slate-800">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-center bg-slate-800 border-slate-700 text-slate-200 hover:bg-rose-950 hover:text-rose-200 hover:border-rose-900"
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Dashboard Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 hidden md:flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Platform</span>
            <span>/</span>
            <span className="font-semibold text-slate-800 capitalize">
              {user?.role?.toLowerCase().replace('_', ' ')} Workspace
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              API Connected
            </span>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name}</p>
              <p className="text-[11px] text-slate-400 leading-tight">{user?.role}</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm border border-indigo-200">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
