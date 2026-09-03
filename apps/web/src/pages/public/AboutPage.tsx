import React from 'react';
import { Truck, ShieldCheck, MapPin, Award, Users, Clock } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          About Apex Courier & Logistics
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Building the digital supply chain backbone for modern commerce with transparency, speed, and cutting-edge software architecture.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200">
          <CardContent className="p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Truck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">National Transit Grid</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Operating cross-dock hubs and automated sortation centers connecting urban centers to tier 2 & tier 3 towns.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Guaranteed Custody</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every parcel handoff is tracked through secure cryptographically signed events and real-time checkpoint logs.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Predictable SLAs</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dynamic delivery estimation powered by hub-level volume balancing and weather-aware routing.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
