import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shipmentsApi, pickupApi, paymentsApi } from '../../services/api';
import type { ShipmentDto } from '@courier/types';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Package,
  MapPin,
  Calendar,
  Clock,
  ExternalLink,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Truck,
  ArrowLeft,
  FileText,
} from 'lucide-react';

export const ShipmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pickup scheduling modal
  const [scheduleModal, setScheduleModal] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [timeSlotStart, setTimeSlotStart] = useState('09:00');
  const [timeSlotEnd, setTimeSlotEnd] = useState('13:00');
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await shipmentsApi.getShipmentById(id);
      if (res.data.success && res.data.data) {
        setShipment(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not load shipment details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleSchedulePickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipment) return;
    setScheduleLoading(true);
    try {
      await pickupApi.schedulePickup({
        shipmentId: shipment.id,
        scheduledDate,
        timeSlotStart,
        timeSlotEnd,
      });
      setScheduleModal(false);
      fetchDetail();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to schedule pickup');
    } finally {
      setScheduleLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading consignment details...</div>;
  }

  if (error || !shipment) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Error Loading Shipment</h2>
        <p className="text-sm text-slate-500 mt-1 mb-4">{error || 'Consignment not found'}</p>
        <Button onClick={() => navigate('/my-shipments')}>Back to Shipments</Button>
      </div>
    );
  }

  const pickupAddr = shipment.addresses?.find((a: any) => a.type === 'PICKUP');
  const deliveryAddr = shipment.addresses?.find((a: any) => a.type === 'DELIVERY');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/my-shipments')} className="flex items-center gap-1.5 w-fit">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Shipments</span>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/track?id=${shipment.trackingNumber}`)}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Public Tracking Page</span>
          </Button>
          {!shipment.pickup && shipment.status === 'CREATED' && (
            <Button
              size="sm"
              onClick={() => setScheduleModal(true)}
              className="bg-sky-600 hover:bg-sky-500 text-xs font-semibold"
            >
              Schedule Pickup
            </Button>
          )}
        </div>
      </div>

      {/* Main Header Banner */}
      <Card className="p-6 bg-slate-900 text-white border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase text-sky-400">Consignment Number</span>
            <div className="flex items-center gap-3 mt-0.5">
              <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
                {shipment.trackingNumber}
              </h1>
              <Badge variant="outline" className="border-sky-400 text-sky-300">
                {shipment.shipmentType}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">Carrier: {shipment.carrier}</p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-400">Current Status</span>
            <div className="mt-1">
              <Badge className="text-sm px-3 py-1 font-semibold">{shipment.status.replace(/_/g, ' ')}</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Booked: {new Date(shipment.createdAt).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </Card>

      {/* Address Snapshots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Origin Pickup Card */}
        <Card className="p-6 border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-sky-600" />
            Pickup Location (Origin Snapshot)
          </h3>
          {pickupAddr ? (
            <div className="space-y-1 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{pickupAddr.name}</p>
              <p className="text-xs text-slate-500">{pickupAddr.phone}</p>
              <p className="text-xs text-slate-600 mt-2">
                {pickupAddr.addressLine1}
                {pickupAddr.addressLine2 ? `, ${pickupAddr.addressLine2}` : ''}
              </p>
              <p className="text-xs text-slate-600 font-medium">
                {pickupAddr.city}, {pickupAddr.state} - {pickupAddr.postalCode}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No origin address recorded.</p>
          )}
        </Card>

        {/* Destination Delivery Card */}
        <Card className="p-6 border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            Delivery Location (Destination Snapshot)
          </h3>
          {deliveryAddr ? (
            <div className="space-y-1 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{deliveryAddr.name}</p>
              <p className="text-xs text-slate-500">{deliveryAddr.phone}</p>
              <p className="text-xs text-slate-600 mt-2">
                {deliveryAddr.addressLine1}
                {deliveryAddr.addressLine2 ? `, ${deliveryAddr.addressLine2}` : ''}
              </p>
              <p className="text-xs text-slate-600 font-medium">
                {deliveryAddr.city}, {deliveryAddr.state} - {deliveryAddr.postalCode}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No delivery address recorded.</p>
          )}
        </Card>
      </div>

      {/* Package Specs & Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Package Specs */}
        <Card className="p-5 border-slate-200">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-indigo-600" /> Package Details
          </h4>
          {shipment.package ? (
            <div className="space-y-1 text-xs text-slate-700">
              <div>Type: <strong className="text-slate-900">{shipment.package.packageType}</strong></div>
              <div>Weight: <strong className="text-slate-900">{shipment.package.weight} kg</strong></div>
              <div>
                Dimensions:{' '}
                <strong className="text-slate-900">
                  {shipment.package.length} x {shipment.package.width} x {shipment.package.height} cm
                </strong>
              </div>
              {shipment.package.description && (
                <div className="text-slate-500 mt-1 italic">"{shipment.package.description}"</div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No package recorded.</p>
          )}
        </Card>

        {/* Shipping Charges */}
        <Card className="p-5 border-slate-200">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-sky-600" /> Financials & Charges
          </h4>
          <div className="space-y-1 text-xs text-slate-700">
            <div className="flex justify-between">
              <span>Shipping Fee:</span>
              <strong className="text-slate-900">₹{Number(shipment.shippingCost).toFixed(2)}</strong>
            </div>
            {shipment.shipmentType === 'COD' && (
              <div className="flex justify-between text-amber-700 font-semibold pt-1 border-t border-slate-100">
                <span>COD Amount to Collect:</span>
                <span>₹{Number(shipment.codAmount).toFixed(2)}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Proof of Delivery / Status */}
        <Card className="p-5 border-slate-200">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Proof of Delivery
          </h4>
          {shipment.proofOfDelivery ? (
            <div className="space-y-1 text-xs text-emerald-800">
              <div>Received by: <strong>{shipment.proofOfDelivery.recipientName}</strong> ({shipment.proofOfDelivery.recipientRelation || 'SELF'})</div>
              <div>Timestamp: {new Date(shipment.proofOfDelivery.createdAt).toLocaleString('en-IN')}</div>
              {shipment.proofOfDelivery.notes && <p className="text-slate-500 italic">"{shipment.proofOfDelivery.notes}"</p>}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Consignment pending delivery.</p>
          )}
        </Card>
      </div>

      {/* Tracking Journey Timeline */}
      <Card className="p-6 border-slate-200">
        <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-600" />
          Milestone Checkpoint History
        </h3>

        <div className="relative pl-6 border-l-2 border-slate-200 space-y-6 my-2 ml-2">
          {shipment.events?.map((ev: any, idx: number) => (
            <div key={idx} className="relative">
              <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-sky-600 border-2 border-white ring-2 ring-sky-100" />
              <div className="flex justify-between items-start text-xs">
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">{ev.title}</h4>
                  <p className="text-slate-600 mt-0.5">{ev.description}</p>
                  {ev.city && (
                    <span className="text-[11px] text-slate-400 inline-block mt-0.5">
                      Location: {ev.city}, {ev.state || ''}
                    </span>
                  )}
                </div>
                <span className="text-slate-400 font-mono">
                  {new Date(ev.createdAt).toLocaleString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Schedule Pickup Modal */}
      {scheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 bg-white shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Schedule Carrier Pickup</h3>
            <p className="text-xs text-slate-500 mb-4">
              Select a preferred date and time window for the carrier to collect your parcel.
            </p>
            <form onSubmit={handleSchedulePickup} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Pickup Date</label>
                <Input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Window Start</label>
                  <Input
                    type="time"
                    required
                    value={timeSlotStart}
                    onChange={(e) => setTimeSlotStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Window End</label>
                  <Input
                    type="time"
                    required
                    value={timeSlotEnd}
                    onChange={(e) => setTimeSlotEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setScheduleModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={scheduleLoading} className="bg-sky-600 hover:bg-sky-500">
                  {scheduleLoading ? 'Scheduling...' : 'Confirm Schedule'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ShipmentDetailPage;
