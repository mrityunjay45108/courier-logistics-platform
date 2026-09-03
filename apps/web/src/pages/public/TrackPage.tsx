import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Package, MapPin, Calendar, Clock, AlertCircle, CheckCircle2, Truck } from 'lucide-react';
import { apiClient } from '../../services/api';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { EmptyState } from '../../components/ui/empty-state';
import type { TrackingResultDto, ApiResponse } from '@courier/types';

export const TrackPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [trackingId, setTrackingId] = useState(searchParams.get('id') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<TrackingResultDto | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchTracking = async (id: string) => {
    if (!id.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    setTrackingData(null);

    try {
      const response = await apiClient.get<ApiResponse<TrackingResultDto>>(`/tracking/${encodeURIComponent(id.trim())}`);
      if (response.data.data) {
        setTrackingData(response.data.data);
      } else {
        setErrorMessage('Shipment not found.');
      }
    } catch (err: unknown) {
      setErrorMessage('Shipment not found.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const queryId = searchParams.get('id');
    if (queryId) {
      setTrackingId(queryId);
      fetchTracking(queryId);
    }
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId.trim()) return;
    setSearchParams({ id: trackingId.trim() });
    fetchTracking(trackingId.trim());
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
          <Truck className="h-3.5 w-3.5" /> Public Tracking System
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Track Your Consignment
        </h1>
        <p className="text-sm text-slate-600 max-w-lg mx-auto">
          Enter your unique AWB or tracking number to view current transit status and checkpoint history.
        </p>
      </div>

      {/* Tracking Input Card */}
      <Card className="shadow-md border-slate-200">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Enter Tracking ID (e.g. TRK-DEMO-9988)"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-medium"
              />
            </div>
            <Button type="submit" size="md" isLoading={isLoading} className="h-11 px-6 font-semibold">
              Track Status
            </Button>
          </form>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Try sample tracking ID: <button type="button" onClick={() => { setTrackingId('TRK-DEMO-9988'); setSearchParams({ id: 'TRK-DEMO-9988' }); fetchTracking('TRK-DEMO-9988'); }} className="text-indigo-600 font-semibold underline underline-offset-2">TRK-DEMO-9988</button></span>
            <span className="text-slate-400">Real-time DB query</span>
          </div>
        </CardContent>
      </Card>

      {/* Error / Not Found State */}
      {errorMessage && (
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="p-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-rose-900">Shipment not found.</h4>
              <p className="text-xs text-rose-700 mt-1">
                We could not find any active or archived shipment with ID <span className="font-mono font-semibold">"{trackingId}"</span>. Please verify the tracking number or contact the merchant/sender.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Initial Empty State */}
      {!trackingData && !errorMessage && !isLoading && (
        <EmptyState
          icon={<Package className="h-7 w-7 text-slate-400" />}
          title="Ready to track"
          description="Enter a valid tracking ID in the search bar above to trace shipment progress."
        />
      )}

      {/* Shipment Details Result */}
      {trackingData && (
        <div className="space-y-6 animate-in fade-in-50">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-900 text-white p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Tracking Number</p>
                <h3 className="text-2xl font-black font-mono tracking-tight text-white mt-0.5">
                  {trackingData.trackingNumber}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-indigo-500 text-white border-none px-3 py-1 text-xs">
                  {trackingData.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>

            <CardContent className="p-6 divide-y divide-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Carrier</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{trackingData.carrier}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Destination</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{trackingData.destination}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Estimated Delivery</p>
                  <p className="text-sm font-semibold text-indigo-600 mt-0.5">
                    {trackingData.estimatedDelivery
                      ? new Date(trackingData.estimatedDelivery).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Pending dispatch'}
                  </p>
                </div>
              </div>

              {/* Milestones / Events */}
              <div className="pt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-6">
                  Checkpoint History
                </h4>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {trackingData.events.map((event, idx) => (
                    <div key={event.id} className="relative">
                      {/* Timeline dot */}
                      <span
                        className={`absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm ${
                          idx === 0 ? 'bg-indigo-600 ring-4 ring-indigo-100' : 'bg-slate-400'
                        }`}
                      />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <p className="text-sm font-bold text-slate-900">{event.status.replace(/_/g, ' ')}</p>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-indigo-700 mt-0.5">{event.location}</p>
                      <p className="text-xs text-slate-600 mt-1">{event.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
