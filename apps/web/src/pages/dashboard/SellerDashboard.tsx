import React from 'react';
import { Package, Truck, ArrowUpRight, Plus, RefreshCw, BarChart2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/empty-state';
import { useAuth } from '../../hooks/useAuth';

export const SellerDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {user?.name}
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 uppercase">
              Merchant Portal
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage bulk order dispatches, manifest generation, pickup scheduling, and RTO tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => alert('Shipment booking feature will be activated in Phase 2')}>
            <Plus className="h-4 w-4 mr-1.5" /> Book Shipment
          </Button>
          <Button size="sm" variant="primary" onClick={() => alert('Manifest download ready in Phase 2')}>
            Generate Manifest
          </Button>
        </div>
      </div>

      {/* Metric Cards - Real Honest Baseline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ready for Pickup</p>
            <p className="text-2xl font-black text-slate-900 mt-1">0</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Awaiting rider arrival</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Transit</p>
            <p className="text-2xl font-black text-slate-900 mt-1">0</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Active on road / air</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivered (MTD)</p>
            <p className="text-2xl font-black text-slate-900 mt-1">0</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">100% on-time record</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">RTO / Returns</p>
            <p className="text-2xl font-black text-slate-900 mt-1">0%</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Returned to origin</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders / Shipments Table Container */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle>Merchant Shipments</CardTitle>
            <CardDescription>Live dispatch records and transit status</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No shipments yet."
            description="You have not booked any shipments yet. Create your first consignment to schedule rider pickup."
            actionLabel="Create First Shipment"
            onAction={() => alert('New shipment booking modal will open here in Phase 2')}
          />
        </CardContent>
      </Card>
    </div>
  );
};
