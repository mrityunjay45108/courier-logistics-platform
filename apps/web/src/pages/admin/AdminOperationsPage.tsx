import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  adminApi,
  shipmentsApi,
  returnsApi,
  partnerApi,
  pricingApi,
} from '../../services/api';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  BarChart3,
  Search,
  Truck,
  Package,
  AlertTriangle,
  IndianRupee,
  Users,
  RotateCcw,
  Activity,
  CheckCircle2,
  Calendar,
  X,
  ExternalLink,
} from 'lucide-react';

export const AdminOperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [loading, setLoading] = useState(true);

  // KPIs
  const [summary, setSummary] = useState<any | null>(null);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // Tab Data
  const [shipments, setShipments] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [returnsList, setReturnsList] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any | null>(null);

  // Exception resolution modal
  const [resolveModal, setResolveModal] = useState(false);
  const [selectedException, setSelectedException] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Task assignment modal
  const [assignModal, setAssignModal] = useState(false);
  const [assignShipmentId, setAssignShipmentId] = useState('');
  const [assignPartnerId, setAssignPartnerId] = useState('');
  const [assignTaskType, setAssignTaskType] = useState('DELIVERY');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [sumRes, exRes, retRes, partRes, actRes, hlthRes] = await Promise.all([
        adminApi.getDashboardSummary(),
        adminApi.listExceptions(),
        returnsApi.listReturns(),
        partnerApi.listAllPartners(),
        adminApi.listActivity(20),
        adminApi.getSystemHealth(),
      ]);

      if (sumRes.data.success && sumRes.data.data) setSummary(sumRes.data.data);
      if (exRes.data.success && exRes.data.data) setExceptions(exRes.data.data);
      if (retRes.data.success && retRes.data.data?.items) setReturnsList(retRes.data.data.items);
      if (partRes.data.success && partRes.data.data) setPartners(partRes.data.data);
      if (actRes.data.success && actRes.data.data) setActivity(actRes.data.data);
      if (hlthRes.data.success && hlthRes.data.data) setSystemHealth(hlthRes.data.data);

      const shipRes = await shipmentsApi.listShipments({ limit: 20 });
      if (shipRes.data.success && shipRes.data.data?.items) setShipments(shipRes.data.data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length >= 2) {
      const res = await adminApi.globalSearch(val.trim());
      if (res.data.success) {
        setSearchResults(res.data.data);
        setSearchOpen(true);
      }
    } else {
      setSearchResults(null);
      setSearchOpen(false);
    }
  };

  const handleResolveException = async () => {
    if (!selectedException) return;
    try {
      await adminApi.resolveException(selectedException.id, resolutionNotes);
      setResolveModal(false);
      setSelectedException(null);
      setResolutionNotes('');
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveReturn = async (id: string) => {
    try {
      await returnsApi.approveReturn(id);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await partnerApi.assignTask({
        shipmentId: assignShipmentId,
        deliveryPartnerId: assignPartnerId,
        taskType: assignTaskType,
      });
      setAssignModal(false);
      setAssignShipmentId('');
      fetchDashboardData();
      alert('Task dispatched to rider successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to dispatch task');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header & Global Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin & Operations Control Center</h1>
          <p className="text-xs text-slate-500">Live platform monitoring, dispatch, exceptions, and reverse logistics</p>
        </div>

        {/* Global Search Box */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Global search tracking #, rider, order..."
            className="pl-9 h-10 text-xs bg-white"
          />

          {searchOpen && searchResults && (
            <Card className="absolute top-12 left-0 right-0 z-50 p-4 bg-white shadow-2xl border-slate-300 max-h-96 overflow-y-auto">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-2">
                <span className="text-xs font-bold text-slate-700">Search Results</span>
                <button onClick={() => setSearchOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
              </div>

              {searchResults.shipments.length > 0 && (
                <div className="mb-3">
                  <span className="text-[11px] font-bold text-sky-700 uppercase">Shipments</span>
                  {searchResults.shipments.map((s: any) => (
                    <div
                      key={s.id}
                      onClick={() => { navigate(`/shipments/${s.id}`); setSearchOpen(false); }}
                      className="p-1.5 hover:bg-slate-50 rounded text-xs flex justify-between cursor-pointer"
                    >
                      <span className="font-mono font-semibold text-slate-800">{s.trackingNumber}</span>
                      <Badge variant="outline">{s.status}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.partners.length > 0 && (
                <div className="mb-3">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase">Riders</span>
                  {searchResults.partners.map((p: any) => (
                    <div key={p.id} className="p-1.5 hover:bg-slate-50 rounded text-xs flex justify-between">
                      <span className="font-semibold text-slate-800">{p.fullName} ({p.partnerCode})</span>
                      <Badge variant="outline">{p.availabilityStatus}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* KPI Stats Tiles */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-4 border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Shipments</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{summary.kpis.totalShipments}</div>
            <span className="text-[10px] text-sky-600 font-medium">Global Volume</span>
          </Card>

          <Card className="p-4 border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">In Transit</span>
            <div className="text-2xl font-black text-sky-600 mt-1">{summary.kpis.inTransitShipments}</div>
            <span className="text-[10px] text-slate-400">Moving between hubs</span>
          </Card>

          <Card className="p-4 border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Delivered</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{summary.kpis.deliveredShipments}</div>
            <span className="text-[10px] text-emerald-600 font-medium">Successfully completed</span>
          </Card>

          <Card className="p-4 border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Exceptions</span>
            <div className="text-2xl font-black text-rose-600 mt-1">{summary.kpis.openExceptions}</div>
            <span className="text-[10px] text-rose-500 font-medium">Require action</span>
          </Card>

          <Card className="p-4 border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Active Riders</span>
            <div className="text-2xl font-black text-indigo-600 mt-1">{summary.kpis.activePartners}</div>
            <span className="text-[10px] text-indigo-500 font-medium">{summary.kpis.pendingTasks} active tasks</span>
          </Card>

          <Card className="p-4 border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Returns & RTO</span>
            <div className="text-2xl font-black text-amber-600 mt-1">{summary.kpis.totalReturns}</div>
            <span className="text-[10px] text-amber-600 font-medium">Reverse logistics</span>
          </Card>
        </div>
      )}

      {/* Main Operations Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-semibold overflow-x-auto">
        {['DASHBOARD', 'SHIPMENTS', 'EXCEPTIONS', 'RETURNS', 'RIDERS', 'ACTIVITY', 'HEALTH'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-md transition whitespace-nowrap ${
              activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab 1: SHIPMENTS GLOBAL LEDGER */}
      {activeTab === 'SHIPMENTS' && (
        <Card className="p-5 border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-900 text-sm">Global Consignments Ledger</h3>
            <Button size="sm" onClick={() => setAssignModal(true)} className="text-xs bg-sky-600 hover:bg-sky-500">
              Dispatch Task to Rider
            </Button>
          </div>

          <div className="divide-y divide-slate-100">
            {shipments.map((s) => (
              <div key={s.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sky-700">{s.trackingNumber}</span>
                    <Badge variant="outline">{s.status}</Badge>
                    <Badge variant="outline">{s.shipmentType}</Badge>
                  </div>
                  <p className="text-slate-500 mt-0.5">
                    Carrier: {s.carrier} • Cost: ₹{Number(s.shippingCost).toFixed(2)} • Booked: {new Date(s.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate(`/shipments/${s.id}`)} className="text-xs">
                  View Detail
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 2: EXCEPTIONS CENTER */}
      {activeTab === 'EXCEPTIONS' && (
        <Card className="p-5 border-slate-200">
          <h3 className="font-bold text-slate-900 text-sm mb-4">Operational Exceptions Queue</h3>
          {exceptions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">No unresolved exceptions.</div>
          ) : (
            <div className="space-y-3">
              {exceptions.map((ex) => (
                <div key={ex.id} className="p-4 rounded-lg bg-rose-50 border border-rose-200 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-rose-900 text-xs">{ex.title}</span>
                      <Badge variant="danger">{ex.severity}</Badge>
                      <Badge variant="outline">{ex.status}</Badge>
                    </div>
                    <p className="text-xs text-rose-700 mt-1">{ex.description}</p>
                    <span className="text-[11px] text-slate-400 font-mono mt-1 inline-block">
                      Shipment: {ex.shipment?.trackingNumber}
                    </span>
                  </div>
                  {ex.status === 'OPEN' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedException(ex);
                        setResolveModal(true);
                      }}
                      className="text-xs bg-rose-600 hover:bg-rose-500 font-semibold"
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: RETURNS & RTO */}
      {activeTab === 'RETURNS' && (
        <Card className="p-5 border-slate-200">
          <h3 className="font-bold text-slate-900 text-sm mb-4">Reverse Logistics & RTO Requests</h3>
          <div className="divide-y divide-slate-100">
            {returnsList.map((ret) => (
              <div key={ret.id} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{ret.returnNumber}</span>
                    <Badge variant="outline">{ret.type}</Badge>
                    <Badge variant="outline">{ret.status}</Badge>
                  </div>
                  <p className="text-slate-500 mt-0.5">
                    Reason: {ret.reason} • Customer: {ret.user?.name} ({ret.user?.email})
                  </p>
                </div>
                {ret.status === 'REQUESTED' && (
                  <Button
                    size="sm"
                    onClick={() => handleApproveReturn(ret.id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold"
                  >
                    Approve Return
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 4: RIDERS */}
      {activeTab === 'RIDERS' && (
        <Card className="p-5 border-slate-200">
          <h3 className="font-bold text-slate-900 text-sm mb-4">Delivery Partner Roster</h3>
          <div className="divide-y divide-slate-100">
            {partners.map((p) => (
              <div key={p.id} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-900">{p.fullName}</span>
                  <span className="text-slate-400 font-mono ml-2">({p.partnerCode})</span>
                  <p className="text-slate-500 mt-0.5">
                    {p.phone} • Vehicle: {p.vehicleType} ({p.vehicleNumber || 'Standard'})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.availabilityStatus === 'AVAILABLE' ? 'success' : 'outline'}>
                    {p.availabilityStatus}
                  </Badge>
                  <span className="text-slate-400 font-medium">{p._count?.tasks || 0} tasks</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 5: ACTIVITY AUDIT FEED */}
      {activeTab === 'ACTIVITY' && (
        <Card className="p-5 border-slate-200">
          <h3 className="font-bold text-slate-900 text-sm mb-4">System Activity Audit Log</h3>
          <div className="divide-y divide-slate-100">
            {activity.map((act) => (
              <div key={act.id} className="py-2.5 flex justify-between items-center text-xs">
                <div>
                  <span className="font-semibold text-slate-800">{act.action}</span>
                  <span className="text-slate-400 ml-2">by {act.user?.email || 'System'}</span>
                </div>
                <span className="text-slate-400 font-mono">
                  {new Date(act.createdAt).toLocaleTimeString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 6: SYSTEM HEALTH */}
      {activeTab === 'HEALTH' && systemHealth && (
        <Card className="p-6 border-slate-200">
          <h3 className="font-bold text-slate-900 text-sm mb-4">System Telemetry & Health</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded">
              <span className="text-slate-500">Service Status</span>
              <p className="font-bold text-emerald-600 text-sm mt-1">{systemHealth.status}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded">
              <span className="text-slate-500">Database Latency</span>
              <p className="font-bold text-slate-900 text-sm mt-1">{systemHealth.database.latencyMs} ms</p>
            </div>
            <div className="p-3 bg-slate-50 rounded">
              <span className="text-slate-500">Memory (Heap)</span>
              <p className="font-bold text-slate-900 text-sm mt-1">{systemHealth.memory.heapUsedMb} MB</p>
            </div>
            <div className="p-3 bg-slate-50 rounded">
              <span className="text-slate-500">Uptime</span>
              <p className="font-bold text-slate-900 text-sm mt-1">{systemHealth.uptimeSeconds}s</p>
            </div>
          </div>
        </Card>
      )}

      {/* Resolve Exception Modal */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 bg-white shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Resolve Exception</h3>
            <p className="text-xs text-slate-500 mb-4">{selectedException?.title}</p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">Resolution Notes</label>
              <Input
                placeholder="Steps taken to resolve this exception..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setResolveModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleResolveException} className="bg-sky-600 hover:bg-sky-500">
                Mark Resolved
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Assign Task Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 bg-white shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Dispatch Task to Rider</h3>
            <form onSubmit={handleAssignTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Shipment</label>
                <select
                  required
                  value={assignShipmentId}
                  onChange={(e) => setAssignShipmentId(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-300 rounded text-xs bg-white"
                >
                  <option value="">Select Consignment...</option>
                  {shipments.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.trackingNumber} ({s.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Delivery Partner / Rider</label>
                <select
                  required
                  value={assignPartnerId}
                  onChange={(e) => setAssignPartnerId(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-300 rounded text-xs bg-white"
                >
                  <option value="">Select Rider...</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.partnerCode}) - {p.availabilityStatus}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Task Type</label>
                <select
                  value={assignTaskType}
                  onChange={(e) => setAssignTaskType(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-300 rounded text-xs bg-white"
                >
                  <option value="PICKUP">Origin Pickup</option>
                  <option value="DELIVERY">Doorstep Delivery</option>
                  <option value="REVERSE_PICKUP">Reverse Pickup</option>
                  <option value="RTO">Return to Origin (RTO)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAssignModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-sky-600 hover:bg-sky-500">
                  Assign Task
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminOperationsPage;
