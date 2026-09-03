import React, { useEffect, useState } from 'react';
import { Shield, Server, Database, Users, Activity, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { EmptyState } from '../../components/ui/empty-state';
import { apiClient } from '../../services/api';
import type { ApiResponse } from '@courier/types';

export const AdminDashboard: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<string>('Checking...');
  const [dbStatus, setDbStatus] = useState<string>('Checking...');
  const [versionInfo, setVersionInfo] = useState<{ version: string; uptime: number } | null>(null);

  useEffect(() => {
    // Check health
    apiClient
      .get<ApiResponse<{ status: string }>>('/health')
      .then((res) => setHealthStatus(res.data?.data?.status || 'UP'))
      .catch(() => setHealthStatus('DOWN'));

    // Check ready
    apiClient
      .get<ApiResponse<{ status: string; database: string }>>('/ready')
      .then((res) => setDbStatus(res.data?.data?.database || 'CONNECTED'))
      .catch(() => setDbStatus('ERROR'));

    // Check version
    apiClient
      .get<ApiResponse<{ version: string; uptimeSeconds: number }>>('/version')
      .then((res) => {
        if (res.data.data) {
          setVersionInfo({
            version: res.data.data.version,
            uptime: res.data.data.uptimeSeconds,
          });
        }
      })
      .catch(() => null);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              System Administration
            </h1>
            <Badge variant="destructive">ADMIN CONSOLE</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Global system monitoring, database diagnostics, user access control, and platform infrastructure.
          </p>
        </div>
      </div>

      {/* Real Infrastructure Diagnostics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">API Liveness</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`h-2.5 w-2.5 rounded-full ${healthStatus === 'UP' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <p className="text-lg font-bold text-slate-900">{healthStatus}</p>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Express engine alive</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
              <Server className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">PostgreSQL Readiness</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`h-2.5 w-2.5 rounded-full ${dbStatus === 'CONNECTED' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <p className="text-lg font-bold text-slate-900">{dbStatus}</p>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Prisma ORM connection active</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <Database className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Platform Release</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                v{versionInfo?.version || '1.0.0'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Uptime: {versionInfo?.uptime ?? 0}s
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
              <Activity className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Global Audit Ledger */}
      <Card>
        <CardHeader>
          <CardTitle>System Security & Audit Log</CardTitle>
          <CardDescription>Immutable record of privileged operations and authentication attempts</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No audit events yet."
            description="System operations and authorization events will be logged here as administrative actions occur."
          />
        </CardContent>
      </Card>
    </div>
  );
};
