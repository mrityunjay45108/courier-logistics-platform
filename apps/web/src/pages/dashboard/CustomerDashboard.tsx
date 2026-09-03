import React from 'react';
import { Package, MapPin, Clock, Plus, Search, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/empty-state';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track your deliveries, manage delivery addresses, and view consignment history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/track">
            <Button size="sm" variant="outline">
              <Search className="h-4 w-4 mr-1.5" /> Track Consignment
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards - Real zero baseline */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Deliveries</p>
              <p className="text-2xl font-black text-slate-900 mt-1">0</p>
              <p className="text-[11px] text-slate-400 mt-0.5">In-transit to your address</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
              <Package className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Orders</p>
              <p className="text-2xl font-black text-slate-900 mt-1">0</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Lifetime delivered</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saved Addresses</p>
              <p className="text-2xl font-black text-slate-900 mt-1">0</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Delivery destinations</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
              <MapPin className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shipment Ledger Empty State */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Consignments</CardTitle>
          <CardDescription>All parcels booked or scheduled for delivery to you</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No shipments yet."
            description="When a merchant or sender dispatches a parcel to your address, it will automatically appear in this ledger."
            actionLabel="Track by Tracking ID"
            onAction={() => (window.location.href = '/track')}
          />
        </CardContent>
      </Card>
    </div>
  );
};
