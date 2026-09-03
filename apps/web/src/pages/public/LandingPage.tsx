import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Truck,
  Search,
  ShieldCheck,
  Zap,
  Globe2,
  Clock,
  ArrowRight,
  CheckCircle2,
  Building2,
  Box,
  BarChart3,
  Lock,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

export const LandingPage: React.FC = () => {
  const [quickTrackingId, setQuickTrackingId] = useState('');
  const navigate = useNavigate();

  const handleQuickTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickTrackingId.trim()) {
      navigate(`/track?id=${encodeURIComponent(quickTrackingId.trim())}`);
    }
  };

  const services = [
    {
      title: 'Express Parcel Delivery',
      desc: 'Next-day and 48-hour delivery across 19,000+ pin codes with automated dispatch.',
      badge: 'B2C Fast Track',
      icon: <Zap className="h-6 w-6 text-amber-600" />,
    },
    {
      title: 'B2B Heavy Cargo',
      desc: 'Full and partial truckload shipping for industrial merchants and warehouses.',
      badge: 'Commercial',
      icon: <Box className="h-6 w-6 text-indigo-600" />,
    },
    {
      title: 'Hyperlocal Courier',
      desc: 'On-demand intracity delivery within 4 hours for medicine, groceries, and urgent docs.',
      badge: 'Same Day',
      icon: <Clock className="h-6 w-6 text-emerald-600" />,
    },
    {
      title: 'Cross-Border Logistics',
      desc: 'Customs clearance, air freight, and end-to-end international tracking.',
      badge: 'Global Air',
      icon: <Globe2 className="h-6 w-6 text-blue-600" />,
    },
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Create Shipment',
      desc: 'Book single or bulk shipments via web console, CSV upload, or e-commerce API.',
    },
    {
      step: '02',
      title: 'Automated Pickup',
      desc: 'Our nearest delivery partner is routed to your warehouse or doorstep for collection.',
    },
    {
      step: '03',
      title: 'Hub Transit & Sorting',
      desc: 'Smart barcode scanning and route optimization across central distribution hubs.',
    },
    {
      step: '04',
      title: 'Secure Delivery',
      desc: 'OTP-verified delivery with instant proof-of-delivery (POD) and status webhook.',
    },
  ];

  const features = [
    {
      title: '99.8% On-Time SLA',
      desc: 'Reliable transit times with predictive delay prevention algorithms.',
      icon: <ShieldCheck className="h-5 w-5 text-indigo-600" />,
    },
    {
      title: 'E-Commerce Ready APIs',
      desc: 'Plug-and-play REST webhooks and endpoints designed for seamless merchant sync.',
      icon: <BarChart3 className="h-5 w-5 text-indigo-600" />,
    },
    {
      title: 'Multi-Role Role Control',
      desc: 'Dedicated enterprise workspaces for Customers, Sellers, Hub Ops, and Riders.',
      icon: <Lock className="h-5 w-5 text-indigo-600" />,
    },
    {
      title: 'Real-Time Checkpoint Auditing',
      desc: 'Every scan and status transition is recorded immutably in the PostgreSQL ledger.',
      icon: <Truck className="h-5 w-5 text-indigo-600" />,
    },
  ];

  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-900 via-slate-900 to-slate-900 text-white pt-20 pb-28 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.15),transparent_70%)] pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs font-semibold tracking-wide uppercase">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
            Enterprise Courier & Supply Chain Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Ship Smarter. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">
              Deliver Faster.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            The next-generation logistics foundation built for modern e-commerce, merchant supply chains, and on-demand delivery. Scalable, auditable, and developer-friendly.
          </p>

          {/* Quick Tracking Widget */}
          <div className="max-w-xl mx-auto mt-8 bg-white/10 backdrop-blur-md p-2.5 rounded-2xl border border-white/20 shadow-2xl">
            <form onSubmit={handleQuickTrack} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter Tracking ID (e.g. TRK-DEMO-9988)"
                  value={quickTrackingId}
                  onChange={(e) => setQuickTrackingId(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium"
                />
              </div>
              <Button type="submit" size="md" className="h-11 px-6 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold">
                Track Now
              </Button>
            </form>
            <p className="text-[11px] text-slate-400 mt-2 text-left pl-2">
              Try demo consignment: <code className="bg-white/10 px-1.5 py-0.5 rounded text-indigo-200">TRK-DEMO-9988</code>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link to="/register">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white">
                Start Shipping Free <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="bg-transparent border-slate-700 text-slate-200 hover:bg-white/5">
                Sign In to Portal
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Shipping Services */}
      <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-2">Our Services</h2>
          <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Engineered for every shipping demand
          </h3>
          <p className="text-sm text-slate-600 mt-3">
            From single express parcels to bulk cargo freight, our infrastructure adapts to your business volume.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((item) => (
            <Card key={item.title} className="hover:border-indigo-200 hover:shadow-md transition-all">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">{item.icon}</div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {item.badge}
                  </span>
                </div>
                <h4 className="font-bold text-base text-slate-900">{item.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-slate-100/70 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-2">Process</h2>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              How our logistics engine operates
            </h3>
            <p className="text-sm text-slate-600 mt-3">
              Seamless end-to-end chain of custody with transparency at every milestone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {workflowSteps.map((step) => (
              <div key={step.step} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative">
                <div className="text-3xl font-black text-indigo-100 mb-3">{step.step}</div>
                <h4 className="font-bold text-base text-slate-900 mb-2">{step.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us & Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-widest">
              Built for Scale
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Enterprise-grade reliability without legacy complexity
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Designed from ground up with a modular monolith architecture. Easy to deploy, lightning fast with PostgreSQL and Prisma, and fully prepared for high-concurrency microservice extraction.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {features.map((feat) => (
                <div key={feat.title} className="space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-sm text-slate-900">
                    {feat.icon}
                    <span>{feat.title}</span>
                  </div>
                  <p className="text-xs text-slate-500 pl-7">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Card Preview */}
          <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-400" />
                <span className="font-bold text-sm">Merchant Logistics Control</span>
              </div>
              <span className="text-xs text-emerald-400 font-medium">99.98% Service Uptime</span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Average Transit Time</p>
                  <p className="text-lg font-bold text-white">28.4 Hours</p>
                </div>
                <span className="text-xs text-emerald-400 font-semibold">-14% vs industry avg</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">PIN Code Coverage</p>
                  <p className="text-lg font-bold text-white">19,450+ Active</p>
                </div>
                <span className="text-xs text-indigo-300 font-semibold">PAN India</span>
              </div>
            </div>

            <div className="pt-2 text-center">
              <Link to="/register">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white justify-center">
                  Register as Seller / Shipper
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Business CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ready to streamline your supply chain?
            </h3>
            <p className="text-indigo-200 text-sm max-w-xl">
              Create your account in 2 minutes. Start booking parcels, managing pickups, and tracking shipments immediately.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/register">
              <Button size="lg" className="bg-white text-indigo-900 hover:bg-slate-100 font-bold">
                Get Started Now
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="bg-transparent border-indigo-300 text-white hover:bg-white/10">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
