import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { returnsApi } from '../../services/api';
import type { ReturnOrderDto } from '@courier/types';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { RotateCcw, Clock, Package, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';

export const CustomerReturnsPage: React.FC = () => {
  const navigate = useNavigate();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await returnsApi.listReturns();
      if (res.data.success && res.data.data) {
        setReturns(res.data.data.items);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'REFUNDED':
        return <Badge variant="success">{status}</Badge>;
      case 'APPROVED':
      case 'PICKED_UP':
      case 'IN_TRANSIT':
        return <Badge variant="default">{status.replace(/_/g, ' ')}</Badge>;
      case 'REJECTED':
      case 'FAILED':
        return <Badge variant="danger">{status}</Badge>;
      default:
        return <Badge variant="outline">{status.replace(/_/g, ' ')}</Badge>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Returns & Reverse Logistics</h1>
          <p className="text-sm text-slate-500">Track reverse pickup status, item inspections, and refund decisions</p>
        </div>
        <Button onClick={() => navigate('/my-shipments')} variant="outline" className="text-xs">
          View Delivered Consignments
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading return requests...</div>
      ) : returns.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-2">
          <RotateCcw className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-semibold text-slate-700">No active return requests</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Returns can be initiated from any delivered package in your shipment list.
          </p>
          <Button size="sm" onClick={() => navigate('/my-shipments')}>
            Go to My Shipments
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {returns.map((ret) => (
            <Card key={ret.id} className="p-5 border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-900 text-base">{ret.returnNumber}</span>
                    {getStatusBadge(ret.status)}
                    <span className="text-xs text-slate-500 font-mono">AWB: {ret.shipment?.trackingNumber}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Reason: <strong>{ret.reason.replace(/_/g, ' ')}</strong>
                    {ret.customerComment ? ` • "${ret.customerComment}"` : ''}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Requested on: {new Date(ret.requestedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/track?id=${ret.shipment?.trackingNumber}`)}
                    className="text-xs flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Track Journey</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerReturnsPage;
