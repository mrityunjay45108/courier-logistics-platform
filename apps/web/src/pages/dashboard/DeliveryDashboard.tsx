import React from 'react';
import { MapPin, CheckCircle2, Navigation, DollarSign, PackageCheck, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/empty-state';
import { Badge } from '../../components/ui/badge';
import { useAuth } from '../../hooks/useAuth';

export const DeliveryDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Delivery Partner Terminal
            </h1>
            <Badge variant="success">RIDER DISPATCH</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Last-mile runsheet, OTP delivery verification, and cash-on-delivery (COD) collection.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="primary" onClick={() => alert('Offline sync feature ready in Phase 2')}>
            <Navigation className="h-4 w-4 mr-1.5" /> Start Navigation
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Deliveries</p>
              <p className="text-2xl font-black text-slate-900 mt-1">0</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Parcels on today's runsheet</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
              <MapPin className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Deliveries</p>
              <p className="text-2xl font-black text-slate-900 mt-1">0</p>
              <p className="text-[11px] text-emerald-600 mt-0.5">Proof-of-delivery captured</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cash to Deposit</p>
              <p className="text-2xl font-black text-slate-900 mt-1">₹0.00</p>
              <p className="text-[11px] text-slate-400 mt-0.5">COD cash in hand</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
              <DollarSign className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's Route Runsheet</CardTitle>
          <CardDescription>Deliveries assigned for doorstep fulfillment</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No shipments yet."
            description="You have no shipments assigned on your runsheet today. Your branch supervisor will assign your route when dispatch commences."
          />
        </CardContent>
      </Card>
    </div>
  );
};
