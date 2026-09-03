import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { shipmentsApi, usersApi, pricingApi } from '../../services/api';
import type { AddressDto, ShippingQuoteResponse } from '@courier/types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Package,
  MapPin,
  CreditCard,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Truck,
} from 'lucide-react';

export const CreateShipmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [savedAddresses, setSavedAddresses] = useState<AddressDto[]>([]);
  const [selectedPickupId, setSelectedPickupId] = useState<string>('');

  const [pickupAddress, setPickupAddress] = useState({
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: 'Patna',
    state: 'Bihar',
    postalCode: '800001',
    country: 'India',
  });

  const [deliveryAddress, setDeliveryAddress] = useState({
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: 'Noida',
    state: 'Uttar Pradesh',
    postalCode: '201301',
    country: 'India',
  });

  const [packageSpecs, setPackageSpecs] = useState({
    weight: 1.5,
    length: 25,
    width: 20,
    height: 15,
    packageType: 'PARCEL' as any,
    description: 'Electronic equipment',
  });

  const [shipmentType, setShipmentType] = useState<'PREPAID' | 'COD'>('PREPAID');
  const [codAmount, setCodAmount] = useState(0);
  const [quote, setQuote] = useState<ShippingQuoteResponse | null>(null);

  useEffect(() => {
    usersApi.getAddresses().then((res) => {
      if (res.data.success && res.data.data) {
        setSavedAddresses(res.data.data);
        const defaultAddr = res.data.data.find((a) => a.isDefault) || res.data.data[0];
        if (defaultAddr) {
          setSelectedPickupId(defaultAddr.id);
        }
      }
    });
  }, []);

  const calculatePreviewQuote = async () => {
    setError(null);
    try {
      const pickupPincode = selectedPickupId
        ? savedAddresses.find((a) => a.id === selectedPickupId)?.postalCode || pickupAddress.postalCode
        : pickupAddress.postalCode;

      const res = await pricingApi.getQuote({
        pickupPincode,
        deliveryPincode: deliveryAddress.postalCode,
        shipmentType,
        weight: packageSpecs.weight,
        length: packageSpecs.length,
        width: packageSpecs.width,
        height: packageSpecs.height,
        codAmount: shipmentType === 'COD' ? codAmount : 0,
      });

      if (res.data.success && res.data.data) {
        setQuote(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not fetch rate quote preview.');
    }
  };

  const handleNextStep = async () => {
    if (step === 3) {
      await calculatePreviewQuote();
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBookShipment = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        package: packageSpecs,
        deliveryAddress,
        shipmentType,
        codAmount: shipmentType === 'COD' ? codAmount : 0,
      };

      if (selectedPickupId) {
        payload.pickupAddressId = selectedPickupId;
      } else {
        payload.pickupAddress = pickupAddress;
      }

      const res = await shipmentsApi.createShipment(payload);
      if (res.data.success && res.data.data) {
        navigate(`/shipments/${res.data.data.id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to book consignment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          {[
            { num: 1, label: 'Pickup' },
            { num: 2, label: 'Delivery' },
            { num: 3, label: 'Package' },
            { num: 4, label: 'Review & Book' },
          ].map((s) => (
            <div key={s.num} className="flex flex-col items-center z-10">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition ${
                  step === s.num
                    ? 'bg-sky-600 text-white ring-4 ring-sky-100'
                    : step > s.num
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {step > s.num ? <Check className="w-5 h-5" /> : s.num}
              </div>
              <span className="text-xs font-medium text-slate-600 mt-1">{s.label}</span>
            </div>
          ))}
          <div className="absolute top-4 left-0 w-full h-0.5 bg-slate-200 -z-0" />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Pickup Address */}
      {step === 1 && (
        <Card className="p-6 border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-sky-600" />
            Step 1: Origin & Pickup Location
          </h2>

          {savedAddresses.length > 0 && (
            <div className="mb-6 space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Select from Saved Address Book:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => setSelectedPickupId(addr.id)}
                    className={`p-3.5 rounded-lg border text-sm cursor-pointer transition ${
                      selectedPickupId === addr.id
                        ? 'border-sky-600 bg-sky-50 text-sky-900 ring-2 ring-sky-600/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-semibold">{addr.name}</span>
                      <Badge variant="outline">{addr.type}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {addr.addressLine1}, {addr.city} ({addr.postalCode})
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{addr.phone}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={() => setStep(2)} className="flex items-center gap-2">
              <span>Next: Receiver Location</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Delivery Address */}
      {step === 2 && (
        <Card className="p-6 border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            Step 2: Recipient & Destination Details
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Recipient Name</label>
                <Input
                  required
                  placeholder="e.g. Vikas Kumar"
                  value={deliveryAddress.name}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Recipient Phone</label>
                <Input
                  required
                  placeholder="e.g. +919876543210"
                  value={deliveryAddress.phone}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 1</label>
              <Input
                required
                placeholder="House/Flat number, Street name"
                value={deliveryAddress.addressLine1}
                onChange={(e) => setDeliveryAddress({ ...deliveryAddress, addressLine1: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <Input
                  required
                  value={deliveryAddress.city}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                <Input
                  required
                  value={deliveryAddress.state}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, state: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pincode</label>
                <Input
                  required
                  value={deliveryAddress.postalCode}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, postalCode: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-6">
            <Button variant="outline" onClick={() => setStep(1)} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <Button onClick={() => setStep(3)} className="flex items-center gap-2">
              <span>Next: Package Specs</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Package & Payment Specs */}
      {step === 3 && (
        <Card className="p-6 border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            Step 3: Package Specifications & Payment Type
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Package Weight (kg)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={packageSpecs.weight}
                  onChange={(e) => setPackageSpecs({ ...packageSpecs, weight: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Package Category</label>
                <select
                  value={packageSpecs.packageType}
                  onChange={(e) => setPackageSpecs({ ...packageSpecs, packageType: e.target.value as any })}
                  className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="PARCEL">General Parcel</option>
                  <option value="ELECTRONICS">Electronics & Gadgets</option>
                  <option value="CLOTHING">Apparel & Footwear</option>
                  <option value="DOCUMENT">Documents / Envelopes</option>
                  <option value="FRAGILE">Fragile Items</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Dimensions (cm) - Length x Width x Height
              </label>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  type="number"
                  placeholder="L"
                  value={packageSpecs.length}
                  onChange={(e) => setPackageSpecs({ ...packageSpecs, length: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  type="number"
                  placeholder="W"
                  value={packageSpecs.width}
                  onChange={(e) => setPackageSpecs({ ...packageSpecs, width: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  type="number"
                  placeholder="H"
                  value={packageSpecs.height}
                  onChange={(e) => setPackageSpecs({ ...packageSpecs, height: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Payment Mode</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => { setShipmentType('PREPAID'); setCodAmount(0); }}
                  className={`p-3 rounded-lg border text-sm font-medium transition ${
                    shipmentType === 'PREPAID'
                      ? 'border-sky-600 bg-sky-50 text-sky-800'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  Prepaid
                </button>
                <button
                  type="button"
                  onClick={() => setShipmentType('COD')}
                  className={`p-3 rounded-lg border text-sm font-medium transition ${
                    shipmentType === 'COD'
                      ? 'border-sky-600 bg-sky-50 text-sky-800'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  Cash on Delivery (COD)
                </button>
              </div>
            </div>

            {shipmentType === 'COD' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  COD Amount to Collect (₹)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={codAmount}
                  onChange={(e) => setCodAmount(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 1250"
                />
              </div>
            )}
          </div>

          <div className="flex justify-between pt-6">
            <Button variant="outline" onClick={() => setStep(2)} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <Button onClick={handleNextStep} className="flex items-center gap-2">
              <span>Next: Review & Quote</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Review & Book */}
      {step === 4 && (
        <Card className="p-6 border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-sky-600" />
            Step 4: Review & Authoritative Shipping Quote
          </h2>

          {quote && (
            <div className="p-5 bg-slate-900 text-white rounded-xl mb-6 shadow-md">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <span className="text-sm font-medium text-slate-400">Total Shipping Cost</span>
                <span className="text-2xl font-bold text-sky-400">₹{quote.total.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-3">
                <div>Delivery Zone: <strong className="text-white">{quote.zone}</strong></div>
                <div>Chargeable Weight: <strong className="text-white">{quote.chargeableWeight} kg</strong></div>
                <div>Freight Charge: <strong className="text-white">₹{quote.baseShipping.toFixed(2)}</strong></div>
                <div>GST (18%): <strong className="text-white">₹{quote.tax.toFixed(2)}</strong></div>
              </div>
            </div>
          )}

          <div className="space-y-3 text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <span className="font-semibold text-slate-900">Destination: </span>
              {deliveryAddress.name} ({deliveryAddress.phone}), {deliveryAddress.addressLine1}, {deliveryAddress.city} - {deliveryAddress.postalCode}
            </div>
            <div>
              <span className="font-semibold text-slate-900">Package: </span>
              {packageSpecs.weight} kg ({packageSpecs.length}x{packageSpecs.width}x{packageSpecs.height} cm) - {packageSpecs.packageType}
            </div>
            <div>
              <span className="font-semibold text-slate-900">Payment: </span>
              {shipmentType} {shipmentType === 'COD' && `(COD Amount: ₹${codAmount})`}
            </div>
          </div>

          <div className="flex justify-between pt-6">
            <Button variant="outline" onClick={() => setStep(3)} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <Button
              onClick={handleBookShipment}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 font-bold px-8 shadow-lg shadow-emerald-600/25"
            >
              {loading ? 'Confirming Booking...' : 'Confirm & Book Consignment'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CreateShipmentPage;
