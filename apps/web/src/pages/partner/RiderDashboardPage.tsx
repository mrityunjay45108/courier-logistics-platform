import React, { useState, useEffect } from 'react';
import { partnerApi, paymentsApi } from '../../services/api';
import type { DeliveryPartnerDto, DeliveryTaskDto } from '@courier/types';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Bike,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Navigation,
  Power,
  RotateCcw,
} from 'lucide-react';

export const RiderDashboardPage: React.FC = () => {
  const [partner, setPartner] = useState<any | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');

  // Action Modals
  const [codModalOpen, setCodModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [codAmount, setCodAmount] = useState(0);
  const [codMethod, setCodMethod] = useState<'CASH' | 'UPI'>('CASH');

  // Completion modal
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [podRecipient, setPodRecipient] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRiderData = async () => {
    setLoading(true);
    try {
      const [pRes, tRes] = await Promise.all([
        partnerApi.getMyProfile(),
        partnerApi.listTasks({ taskType: activeTab !== 'ALL' ? activeTab : undefined }),
      ]);
      if (pRes.data.success) setPartner(pRes.data.data);
      if (tRes.data.success) setTasks(tRes.data.data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiderData();
  }, [activeTab]);

  const handleToggleAvailability = async () => {
    if (!partner) return;
    const nextStatus = partner.availabilityStatus === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';
    try {
      await partnerApi.updateAvailability(nextStatus);
      setPartner({ ...partner, availabilityStatus: nextStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const handleTaskAction = async (taskId: string, targetStatus: string, extraData?: any) => {
    setActionLoading(true);
    try {
      await partnerApi.updateTaskStatus(taskId, {
        status: targetStatus,
        ...extraData,
      });
      fetchRiderData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update task');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCod = async () => {
    if (!selectedTask) return;
    setActionLoading(true);
    try {
      await paymentsApi.recordCodCollection(selectedTask.shipmentId, {
        amount: Number(codAmount),
        method: codMethod,
      });
      setCodModalOpen(false);
      setSelectedTask(null);
      fetchRiderData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record COD');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCompletion = async () => {
    if (!selectedTask) return;
    await handleTaskAction(selectedTask.id, 'COMPLETED', { podRecipientName: podRecipient });
    setCompleteModalOpen(false);
    setSelectedTask(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Rider Status Banner */}
      <Card className="p-6 bg-slate-900 text-white border-slate-800 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{partner?.fullName || 'Rider Portal'}</h1>
                <span className="font-mono text-xs text-slate-400">({partner?.partnerCode})</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Vehicle: {partner?.vehicleType} ({partner?.vehicleNumber || 'Standard'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleAvailability}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
                partner?.availabilityStatus === 'AVAILABLE'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-900'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{partner?.availabilityStatus === 'AVAILABLE' ? 'Online (Accepting Tasks)' : 'Offline'}</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Task Filters */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-semibold overflow-x-auto">
        {['ALL', 'PICKUP', 'DELIVERY', 'REVERSE_PICKUP', 'RTO'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-md transition whitespace-nowrap ${
              activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Task Cards */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading assignments...</div>
      ) : tasks.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <Navigation className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-semibold text-slate-700">No active tasks assigned</h3>
          <p className="text-xs text-slate-500 mt-1">
            New pickup and delivery assignments dispatched by operations will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const destAddr = task.shipment?.addresses?.find((a: any) => a.type === 'DELIVERY');
            const pickupAddr = task.shipment?.addresses?.find((a: any) => a.type === 'PICKUP');
            const targetAddr = task.taskType === 'PICKUP' ? pickupAddr : destAddr;
            const isCod = task.shipment?.shipmentType === 'COD';

            return (
              <Card key={task.id} className="p-5 border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-sky-700">
                        {task.taskNumber}
                      </span>
                      <Badge variant="outline">{task.taskType.replace(/_/g, ' ')}</Badge>
                      <Badge variant={task.status === 'COMPLETED' ? 'success' : 'default'}>
                        {task.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      AWB: {task.shipment?.trackingNumber}
                    </p>
                  </div>

                  {isCod && (
                    <div className="text-left sm:text-right bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                      <span className="text-[11px] font-bold text-amber-800 uppercase flex items-center gap-1">
                        <IndianRupee className="w-3 h-3" /> COD Collection
                      </span>
                      <span className="text-sm font-extrabold text-amber-900">
                        ₹{Number(task.shipment?.codAmount).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="py-3 text-xs text-slate-700 space-y-1">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-slate-900">{targetAddr?.name}</strong> ({targetAddr?.phone})
                      <p className="text-slate-500">
                        {targetAddr?.addressLine1}, {targetAddr?.city} - {targetAddr?.postalCode}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rider Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  {task.status === 'ASSIGNED' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleTaskAction(task.id, 'ACCEPTED')}
                        className="bg-sky-600 hover:bg-sky-500 text-xs font-semibold"
                      >
                        Accept Task
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTaskAction(task.id, 'REJECTED', { rejectionReason: 'Rider busy' })}
                        className="text-xs"
                      >
                        Reject
                      </Button>
                    </>
                  )}

                  {task.status === 'ACCEPTED' && (
                    <Button
                      size="sm"
                      onClick={() => handleTaskAction(task.id, 'STARTED')}
                      className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold"
                    >
                      Start Task
                    </Button>
                  )}

                  {task.status === 'STARTED' && (
                    <>
                      {isCod && task.shipment?.codOrder?.status !== 'COLLECTED' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedTask(task);
                            setCodAmount(Number(task.shipment?.codAmount));
                            setCodModalOpen(true);
                          }}
                          className="bg-amber-600 hover:bg-amber-500 text-xs font-semibold flex items-center gap-1"
                        >
                          <IndianRupee className="w-3.5 h-3.5" />
                          <span>Record COD</span>
                        </Button>
                      )}

                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedTask(task);
                          setPodRecipient(targetAddr?.name || '');
                          setCompleteModalOpen(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete Task</span>
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Complete Task Modal */}
      {completeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 bg-white shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Complete Task Confirmation</h3>
            <p className="text-xs text-slate-500 mb-4">
              Confirm recipient identity to generate electronic Proof of Delivery.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">Recipient Name</label>
              <Input
                value={podRecipient}
                onChange={(e) => setPodRecipient(e.target.value)}
                placeholder="Full name of receiver"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setCompleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmCompletion}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                {actionLoading ? 'Saving...' : 'Confirm Delivery'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Record COD Modal */}
      {codModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 bg-white shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Record COD Collection</h3>
            <p className="text-xs text-slate-500 mb-4">
              Record collected Cash or UPI for consignment{' '}
              <strong>{selectedTask?.shipment?.trackingNumber}</strong>.
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Amount Collected (₹)</label>
                <Input
                  type="number"
                  value={codAmount}
                  onChange={(e) => setCodAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Payment Method</label>
                <select
                  value={codMethod}
                  onChange={(e) => setCodMethod(e.target.value as any)}
                  className="w-full h-9 px-3 border border-slate-300 rounded text-xs bg-white"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI / QR Code</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setCodModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmCod}
                disabled={actionLoading}
                className="bg-amber-600 hover:bg-amber-500"
              >
                {actionLoading ? 'Saving...' : 'Record Collection'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RiderDashboardPage;
