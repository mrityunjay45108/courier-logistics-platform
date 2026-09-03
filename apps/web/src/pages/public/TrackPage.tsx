import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Package,
  MapPin,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Truck,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import { trackingApi, API_BASE_URL } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import type { PublicTrackingResponse } from '@courier/types';

export const TrackPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [trackingId, setTrackingId] = useState(searchParams.get('id') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<PublicTrackingResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const fetchTracking = async (id: string) => {
    if (!id.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await trackingApi.getTracking(id.trim());
      if (response.data.data) {
        setTrackingData(response.data.data);
      } else {
        setErrorMessage('Consignment not found. Please check your tracking number.');
        setTrackingData(null);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Consignment not found. Please check your tracking number.');
      setTrackingData(null);
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

  // Real-Time SSE Stream connection when trackingData is loaded
  useEffect(() => {
    if (!trackingData?.trackingNumber) return;

    const streamUrl = `${API_BASE_URL}/tracking/stream/${encodeURIComponent(trackingData.trackingNumber)}`;
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(streamUrl);

      eventSource.onopen = () => {
        setIsLiveConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'UPDATE' && data.payload) {
            // Re-fetch latest public tracking payload to refresh full timeline & status
            fetchTracking(trackingData.trackingNumber);
          }
        } catch {
          // ignore non-json messages (e.g. heartbeat)
        }
      };

      eventSource.onerror = () => {
        setIsLiveConnected(false);
        eventSource?.close();
      };
    } catch {
      setIsLiveConnected(false);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [trackingData?.trackingNumber]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId.trim()) return;
    setSearchParams({ id: trackingId.trim() });
    fetchTracking(trackingId.trim());
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'success';
      case 'OUT_FOR_DELIVERY':
      case 'IN_TRANSIT':
      case 'PICKED_UP':
        return 'default';
      case 'FAILED_DELIVERY':
      case 'CANCELLED':
        return 'danger';
      default:
        return 'outline';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold">
          <Truck className="h-3.5 w-3.5" /> Public Tracking System
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Track Your Consignment
        </h1>
        <p className="text-sm text-slate-600 max-w-lg mx-auto">
          Enter your unique AWB or consignment number to view real-time checkpoint timeline and delivery status.
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
                placeholder="Enter Tracking ID (e.g. CRL-8F4K2P9X or TRK-DEMO-9988)"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono font-medium"
              />
            </div>
            <Button type="submit" size="md" isLoading={isLoading} className="h-11 px-6 font-semibold bg-sky-600 hover:bg-sky-500">
              Track Status
            </Button>
          </form>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>
              Sample tracking codes:{' '}
              <button
                type="button"
                onClick={() => {
                  setTrackingId('CRL-8F4K2P9X');
                  setSearchParams({ id: 'CRL-8F4K2P9X' });
                  fetchTracking('CRL-8F4K2P9X');
                }}
                className="text-sky-600 font-semibold underline underline-offset-2 mr-2"
              >
                CRL-8F4K2P9X
              </button>
              <button
                type="button"
                onClick={() => {
                  setTrackingId('CRL-772299AA');
                  setSearchParams({ id: 'CRL-772299AA' });
                  fetchTracking('CRL-772299AA');
                }}
                className="text-sky-600 font-semibold underline underline-offset-2 mr-2"
              >
                CRL-772299AA (COD)
              </button>
            </span>
            <span className="text-slate-400">Live SSE Stream Enabled</span>
          </div>
        </CardContent>
      </Card>

      {/* Error / Not Found State */}
      {errorMessage && (
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="p-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-rose-900">Shipment Not Found</h3>
              <p className="text-xs text-rose-700 mt-1">{errorMessage}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tracking Result View */}
      {trackingData && (
        <div className="space-y-6">
          {/* Main Status Header Card */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-900 text-white p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-sky-400">
                    Consignment Number
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <h2 className="text-2xl font-bold font-mono tracking-tight text-white">
                      {trackingData.trackingNumber}
                    </h2>
                    {isLiveConnected && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                        <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                        Live
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Carrier: {trackingData.carrier}</p>
                </div>

                <div className="text-left sm:text-right">
                  <Badge variant={getStatusBadgeVariant(trackingData.status)} className="text-sm px-3 py-1">
                    {trackingData.status.replace(/_/g, ' ')}
                  </Badge>
                  {trackingData.estimatedDeliveryDate && (
                    <div className="mt-2 text-xs text-slate-400 flex sm:justify-end items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-sky-400" />
                      <span>
                        Estimated Delivery:{' '}
                        <strong className="text-white">
                          {new Date(trackingData.estimatedDeliveryDate).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Route Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 bg-slate-50 border-b border-slate-200">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-sky-100 text-sky-700 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium">Origin City</span>
                  <p className="text-sm font-semibold text-slate-900">{trackingData.originCity}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium">Destination City</span>
                  <p className="text-sm font-semibold text-slate-900">{trackingData.destinationCity}</p>
                </div>
              </div>
            </div>

            {/* Milestone Timeline */}
            <CardContent className="p-6 sm:p-8">
              <h3 className="text-base font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600" />
                Tracking Journey & Checkpoints
              </h3>

              <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-8 my-4 ml-3">
                {trackingData.timeline.map((event, idx) => {
                  const isLatest = idx === trackingData.timeline.length - 1;
                  return (
                    <div key={idx} className="relative">
                      {/* Marker dot */}
                      <div
                        className={`absolute -left-[31px] sm:-left-[39px] top-1 w-4 h-4 rounded-full border-2 ${
                          isLatest
                            ? 'bg-sky-600 border-white ring-4 ring-sky-100'
                            : 'bg-white border-slate-400'
                        }`}
                      />

                      <div className="space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                          <h4 className={`text-sm font-semibold ${isLatest ? 'text-sky-700' : 'text-slate-800'}`}>
                            {event.title}
                          </h4>
                          <span className="text-xs text-slate-500">
                            {new Date(event.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{event.description}</p>
                        {event.location && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Privacy Notice Card */}
              <div className="mt-8 p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
                <span>
                  For customer privacy and security, recipient names, street numbers, and phone numbers are masked on public tracking pages.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TrackPage;
