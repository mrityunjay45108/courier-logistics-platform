import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Truck, Menu, X, ArrowRight, ShieldCheck, Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../hooks/useAuth';

export const PublicLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Track Shipment', href: '/track' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  const getDashboardPath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'SELLER':
        return '/seller/dashboard';
      case 'OPERATIONS':
        return '/operations/dashboard';
      case 'DELIVERY_PARTNER':
        return '/delivery/dashboard';
      case 'CUSTOMER':
      default:
        return '/customer/dashboard';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 font-bold text-xl text-slate-900 tracking-tight group">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
              <Truck className="h-5 w-5" />
            </div>
            <span className="flex items-center gap-1.5">
              <span>Apex</span>
              <span className="text-indigo-600">Logistics</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'text-indigo-600 bg-indigo-50 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Auth CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <Link to={getDashboardPath()}>
                <Button size="sm" variant="primary">
                  Dashboard <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button size="sm" variant="ghost">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" variant="primary">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-3 animate-in slide-in-from-top-4">
            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-base font-medium rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  {link.name}
                </Link>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {isAuthenticated ? (
                <Link to={getDashboardPath()} onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full justify-center">Go to Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-center">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full justify-center">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Page Body */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2 font-bold text-lg text-slate-900">
                <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Truck className="h-4 w-4" />
                </div>
                <span>Apex Logistics</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Scalable logistics infrastructure designed for modern e-commerce, enterprises, and individual shippers.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <ShieldCheck className="h-4 w-4" /> Enterprise-grade security
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3">Platform</h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li><Link to="/track" className="hover:text-indigo-600">Track Consignment</Link></li>
                <li><Link to="/register" className="hover:text-indigo-600">Seller Onboarding</Link></li>
                <li><Link to="/about" className="hover:text-indigo-600">Network Reach</Link></li>
                <li><a href="#services" className="hover:text-indigo-600">Express Delivery</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3">Company</h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li><Link to="/about" className="hover:text-indigo-600">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-indigo-600">Support & Inquiries</Link></li>
                <li><span className="text-slate-400">Careers (Hiring)</span></li>
                <li><span className="text-slate-400">Press Kit</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3">Developer & API</h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li><span className="text-slate-500">API Documentation</span></li>
                <li><span className="text-slate-500">Webhook Integration</span></li>
                <li><span className="text-slate-500">E-Commerce Connectors</span></li>
                <li><span className="text-slate-500">System Status: Operational</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <p>© {new Date().getFullYear()} Courier & Logistics Platform. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span>Terms of Service</span>
              <span>Privacy Policy</span>
              <span>Security Policy</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
