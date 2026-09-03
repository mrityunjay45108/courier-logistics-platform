import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { shipmentsApi, returnsApi } from '../../services/api';
import type { ShipmentDto } from '@courier/types';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Package,
  Search,
  Plus,
  ExternalLink,
  Ban,
  RotateCcw,
  Clock,
  MapPin,
  AlertCircle,
  Truck,
} from 'lucide-react';

export const ShipmentListPage: React.FC = () => {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<ShipmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ALL');

  // Cancel modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<ShipmentDto | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Return modal state
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('DEFECTIVE_ITEM');
  const [returnComment, setReturnComment] = useState('');

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const res = await shipmentsApi.listShipments({
        search: search.trim() || undefined,
        status: activeTab !== 'ALL' ? activeTab : undefined,
      });
      if (res.data.success && res.data.data) {
        setShipments(res.data.data.items);
      }
    } catch (err) {
      console.error('Failed to load shipments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchShipments();
  };

  const handleCancelShipment = async () => {
    if (!selectedShipment) return;
    setActionLoading(true);
    try {
      await shipmentsApi.cancelShipment(selectedShipment.id, cancelReason);
      setCancelModalOpen(false);
      setSelectedShipment(null);
      setCancelReason('');
      fetchShipments();
    } catch (err) {
      console.error('Cancel failed', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnSubmit = async () => {
    if (!selectedShipment) return;
    setActionLoading(true);
    try {
      await returnsApi.createReturn({
        shipmentId: selectedShipment.id,
        reason: returnReason,
        comment: returnComment,
      });
      setReturnModalOpen(false);
      setSelectedShipment(null);
      setReturnComment('');
      navigate('/returns');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit return request');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <Badge variant="success">Delivered</Badge>;
      case 'OUT_FOR_DELIVERY':
        return <Badge variant="default">Out for Delivery</Badge>;
      case 'IN_TRANSIT':
        return <Badge variant="default">In Transit</Badge>;
      case 'PICKUP_SCHEDULED':
        return <Badge variant="outline">Pickup Scheduled</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">Cancelled</Badge>;
      case 'RETURN_INITIATED':
        return <Badge variant="warning">Return Initiated</Badge>;
      default:
        return <Badge variant="outline">{status.replace(/_/g, ' ')}</Badge>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Consignments & Orders</h1>
          <p className="text-sm text-slate-500">Track shipments, schedule pickups, or initiate returns</p>
        </div>
        <Button onClick={() => navigate('/create-shipment')} className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500">
          <Plus className="w-4 h-4" />
          <span>Book New Shipment</span>
        </Button>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-semibold overflow-x-auto">
          {['ALL', 'CREATED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md transition whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <Input
            placeholder="Search tracking # or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 h-9 text-xs"
          />
          <Button type="submit" size="sm" variant="outline">
            <Search className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>

      {/* Shipments List Table / Cards */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading consignments...</div>
      ) : shipments.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No consignments found</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Book your first shipment or adjust your search filter.</p>
          <Button onClick={() => navigate('/create-shipment')} size="sm">
            Book Shipment
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {shipments.map((s) => {
            const destAddr = s.addresses?.find((a) => a.type === 'DELIVERY');
            const canCancel = ['DRAFT', 'CREATED', 'PICKUP_SCHEDULED'].includes(s.status);
            const canReturn = s.status === 'DELIVERED';

            return (
              <Card key={s.id} className="p-5 border-slate-200 hover:border-slate-300 transition">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/shipments/${s.id}`}
                        className="font-mono font-bold text-base text-sky-700 hover:underline"
                      >
                        {s.trackingNumber}
                      </Link>
                      {getStatusBadge(s.status)}
                      <Badge variant="outline" className="text-xs">{s.shipmentType}</Badge>
                    </div>

                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      {destAddr && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {destAddr.name}, {destAddr.city} ({destAddr.postalCode})
                        </span>
                      )}
                      <span>Weight: {s.package?.weight || 1} kg</span>
                      <span>Total: ₹{Number(s.shippingCost).toFixed(2)}</span>
                      <span>
                        Booked:{' '}
                        {new Date(s.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/track?id=${s.trackingNumber}`)}
                      className="text-xs flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Track</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/shipments/${s.id}`)}
                      className="text-xs"
                    >
                      View
                    </Button>

                    {canCancel && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setSelectedShipment(s);
                          setCancelModalOpen(true);
                        }}
                        className="text-xs flex items-center gap-1 bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                      >
                        <Ban className="w-3 h-3" />
                        <span>Cancel</span>
                      </Button>
                    )}

                    {canReturn && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedShipment(s);
                          setReturnModalOpen(true);
                        }}
                        className="text-xs flex items-center gap-1 text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Request Return</span>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 bg-white shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Cancel Shipment</h3>
            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to cancel consignment{' '}
              <strong className="text-slate-800">{selectedShipment?.trackingNumber}</strong>?
            </p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">Cancellation Reason</label>
              <Input
                placeholder="e.g. Customer cancelled order"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setCancelModalOpen(false)}>
                Nevermind
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleCancelShipment}
                disabled={actionLoading}
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Return Modal */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 bg-white shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Request Return / Reverse Pickup</h3>
            <p className="text-xs text-slate-500 mb-4">
              Submit return request for delivered package{' '}
              <strong className="text-slate-800">{selectedShipment?.trackingNumber}</strong>.
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Return Reason</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-300 rounded-md text-xs bg-white"
                >
                  <option value="DEFECTIVE_ITEM">Defective / Damaged Item</option>
                  <option value="WRONG_ITEM">Wrong Item Received</option>
                  <option value="ITEM_NOT_AS_DESCRIBED">Item Not As Described</option>
                  <option value="SIZE_ISSUE">Size / Fit Issue</option>
                  <option value="CUSTOMER_CHANGED_MIND">Changed Mind</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Customer Note / Details</label>
                <Input
                  placeholder="Describe the reason for return..."
                  value={returnComment}
                  onChange={(e) => setReturnComment(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setReturnModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleReturnSubmit}
                disabled={actionLoading}
                className="bg-amber-600 hover:bg-amber-500 font-semibold text-white"
              >
                {actionLoading ? 'Submitting...' : 'Submit Return Request'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ShipmentListPage;
