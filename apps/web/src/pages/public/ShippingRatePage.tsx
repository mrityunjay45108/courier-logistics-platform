import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pricingApi } from '../../services/api';
import type { ShippingQuoteResponse } from '@courier/types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Calculator, ArrowRight, CheckCircle2, AlertCircle, Package } from 'lucide-react';

export const ShippingRatePage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    pickupPincode: '110001',
    deliveryPincode: '800001',
    weight: 1.5,
    length: 25,
    width: 20,
    height: 15,
    shipmentType: 'PREPAID' as 'PREPAID' | 'COD',
    codAmount: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<ShippingQuoteResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await pricingApi.getQuote({
        pickupPincode: formData.pickupPincode,
        deliveryPincode: formData.deliveryPincode,
        weight: Number(formData.weight),
        length: Number(formData.length),
        width: Number(formData.width),
        height: Number(formData.height),
        shipmentType: formData.shipmentType,
        codAmount: formData.shipmentType === 'COD' ? Number(formData.codAmount) : 0,
      });

      if (res.data.success && res.data.data) {
        setQuote(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to calculate rate quote.');
      setQuote(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight sm:text-4xl">
          Shipping Rate Calculator
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Get real-time, dynamic quotes based on weight, dimensions, destination zones, and service options.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-7">
          <Card className="p-6 bg-white border-slate-200 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Pickup Pincode
                  </label>
                  <Input
                    required
                    value={formData.pickupPincode}
                    onChange={(e) => setFormData({ ...formData, pickupPincode: e.target.value })}
                    placeholder="e.g. 110001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Delivery Pincode
                  </label>
                  <Input
                    required
                    value={formData.deliveryPincode}
                    onChange={(e) => setFormData({ ...formData, deliveryPincode: e.target.value })}
                    placeholder="e.g. 800001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Actual Dead Weight (kg)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  required
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Dimensions (cm) - Length x Width x Height
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    type="number"
                    min="1"
                    required
                    placeholder="L (cm)"
                    value={formData.length}
                    onChange={(e) => setFormData({ ...formData, length: parseFloat(e.target.value) || 0 })}
                  />
                  <Input
                    type="number"
                    min="1"
                    required
                    placeholder="W (cm)"
                    value={formData.width}
                    onChange={(e) => setFormData({ ...formData, width: parseFloat(e.target.value) || 0 })}
                  />
                  <Input
                    type="number"
                    min="1"
                    required
                    placeholder="H (cm)"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Volumetric weight formula: (L x W x H) / 5000
                </p>
              </div>

              <div className="pt-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment & Service Option
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, shipmentType: 'PREPAID', codAmount: 0 })}
                    className={`py-2.5 px-4 rounded-lg text-sm font-medium border transition ${
                      formData.shipmentType === 'PREPAID'
                        ? 'border-sky-600 bg-sky-50 text-sky-700 ring-2 ring-sky-600/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Prepaid Express
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, shipmentType: 'COD' })}
                    className={`py-2.5 px-4 rounded-lg text-sm font-medium border transition ${
                      formData.shipmentType === 'COD'
                        ? 'border-sky-600 bg-sky-50 text-sky-700 ring-2 ring-sky-600/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Cash on Delivery (COD)
                  </button>
                </div>
              </div>

              {formData.shipmentType === 'COD' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    COD Amount to Collect from Recipient (₹)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={formData.codAmount}
                    onChange={(e) => setFormData({ ...formData, codAmount: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g. 1500"
                  />
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Calculating Rate...' : 'Calculate Shipping Rate'}
              </Button>
            </form>
          </Card>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-5">
          {quote ? (
            <Card className="p-6 bg-slate-900 text-white border-slate-800 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <Badge variant="outline" className="border-sky-400 text-sky-300 font-medium">
                    {quote.zone}
                  </Badge>
                  <span className="ml-2 text-xs text-slate-400 font-mono">#{quote.quoteNumber}</span>
                </div>
                <Badge variant={quote.shipmentType === 'PREPAID' ? 'success' : 'default'}>
                  {quote.shipmentType}
                </Badge>
              </div>

              <div className="py-6 border-b border-slate-800 text-center">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Total Estimate</span>
                <div className="mt-1 flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-extrabold text-white">₹{quote.total.toFixed(2)}</span>
                  <span className="text-sm text-slate-400 font-medium">INR</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Inclusive of GST & all applicable charges</p>
              </div>

              <div className="py-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Dead Weight:</span>
                  <span className="text-white font-medium">{quote.actualWeight} kg</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Volumetric Weight:</span>
                  <span className="text-white font-medium">{quote.volumetricWeight} kg</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Chargeable Weight (Slab):</span>
                  <span className="text-white font-semibold">{quote.chargeableWeight} kg</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800">
                  <span>Base Freight:</span>
                  <span className="text-white font-medium">₹{quote.baseShipping.toFixed(2)}</span>
                </div>
                {quote.additionalWeightCharge > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Additional Weight:</span>
                    <span className="text-white font-medium">₹{quote.additionalWeightCharge.toFixed(2)}</span>
                  </div>
                )}
                {quote.codFee > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>COD Processing Fee:</span>
                    <span className="text-white font-medium">₹{quote.codFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Fuel Surcharge:</span>
                  <span className="text-white font-medium">₹{quote.surcharge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tax (18% GST):</span>
                  <span className="text-white font-medium">₹{quote.tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={() => navigate('/create-shipment')}
                  className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold py-2.5 shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2"
                >
                  <span>Book Consignment Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-8 bg-slate-50 border-dashed border-2 border-slate-300 rounded-xl text-center flex flex-col items-center justify-center min-h-[360px]">
              <div className="w-14 h-14 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 mb-4">
                <Calculator className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Instant Rate Quotes</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-sm">
                Enter pickup and delivery pincodes with package weight to preview transparent shipping rates and delivery zone classifications.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShippingRatePage;
