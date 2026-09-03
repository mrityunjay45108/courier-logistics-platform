import React from 'react';
import { Activity, Layers, ArrowDownLeft, ArrowUpRight, BarChart3, ScanLine } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/empty-state';
import { Badge } from '../../components/ui/badge';
import { useAuth } from '../../hooks/useAuth';

export const OperationsDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Central Hub Operations
            </h1>
            <Badge variant="warning">OPERATIONS WORKSPACE</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Sortation management, inbound truck de-manifesting, bag dispatch, and checkpoint scanning.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="primary" onClick={() => alert('Barcode camera scanner ready in Phase 2')}>
            <ScanLine className="h-4 w-4 mr-1.5" /> Scan AWB Checkpoint
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inbound Queue</p>
              <p className="text-2xl font-black text-slate-900 mt-1">0</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Bags arriving at hub</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
              <ArrowDownLeft className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sorting Line</p>
              <p className="text-2xl font-black text-slate-900 mt-1">0</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Parcels pending bin assignment</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
              <Layers className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outbound Dispatch</p>
              <p className="text-2xl font-black text-slate-900 mt-1">0</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Manifested to destination branch</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowUpRight className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hub Sortation Ledger</CardTitle>
          <CardDescription>Live scans and hub manifest records</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No shipments yet."
            description="The hub sortation ledger is empty. Incoming vehicle manifests will trigger line-haul sorting here."
          />
        </CardContent>
      </Card>
    </div>
  );
};
