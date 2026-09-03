import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Contact Operations & Support
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Reach our round-the-clock logistics team for merchant onboarding, escalation, or shipment queries.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <Card className="border-slate-200">
          <CardContent className="p-6 sm:p-8">
            {submitted ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-lg text-slate-900">Message Dispatched</h3>
                <p className="text-xs text-slate-600">
                  Our regional operations desk has received your ticket and will respond within 2 business hours.
                </p>
                <Button size="sm" variant="outline" onClick={() => setSubmitted(false)}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Your Name" required placeholder="Jane Doe" />
                <Input label="Email Address" type="email" required placeholder="jane@example.com" />
                <Input label="Tracking or Consignment ID (Optional)" placeholder="TRK-XXXX-YYYY" />
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Inquiry Details
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe your query or integration requirements..."
                    className="flex w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
                <Button type="submit" className="w-full justify-center">
                  Submit Inquiry <Send className="h-4 w-4 ml-1.5" />
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <h3 className="font-bold text-base text-slate-900">National Headquarters</h3>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>Sector 62, Cyber City, Logistics Hub Block B, Noida, UP 201309</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>1800-419-LOGISTICS (24x7 Toll Free)</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>support@courier-logistics.local</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-900">Developer SLA Support</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you an e-commerce platform integrating via REST APIs? Contact our developer solutions team directly at <span className="font-semibold text-indigo-700">api-support@courier-logistics.local</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
