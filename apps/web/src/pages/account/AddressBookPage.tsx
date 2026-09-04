import React, { useState, useEffect } from "react";
import { usersApi } from "../../services/api";
import type { AddressDto } from "@courier/types";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { MapPin, Plus, Trash2, CheckCircle2, Star } from "lucide-react";

export const AddressBookPage: React.FC = () => {
  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "Patna",
    state: "Bihar",
    postalCode: "800001",
    country: "India",
    type: "HOME" as "HOME" | "OFFICE" | "OTHER",
    isDefault: false,
  });

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const res = await usersApi.getAddresses();
      if (res.data.success && res.data.data) {
        setAddresses(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load addresses", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await usersApi.createAddress(formData);
      setModalOpen(false);
      setFormData({
        name: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        city: "Patna",
        state: "Bihar",
        postalCode: "800001",
        country: "India",
        type: "HOME",
        isDefault: false,
      });
      fetchAddresses();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save address");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await usersApi.setDefaultAddress(id);
      fetchAddresses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    try {
      await usersApi.deleteAddress(id);
      fetchAddresses();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Saved Addresses</h1>
          <p className="text-sm text-slate-500">
            Manage pickup origins and shipping destination contacts
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Address</span>
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          Loading address book...
        </div>
      ) : addresses.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-2">
          <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-semibold text-slate-700">No saved addresses</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Add your home, warehouse, or office address for fast booking.
          </p>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            Add Address
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <Card
              key={addr.id}
              className="p-5 border-slate-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {addr.name}
                    </span>
                    {addr.isDefault && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Default
                      </span>
                    )}
                  </div>
                  <Badge variant="outline">{addr.type}</Badge>
                </div>
                <p className="text-xs text-slate-500">{addr.phone}</p>
                <p className="text-xs text-slate-600 mt-2">
                  {addr.addressLine1}
                  {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
                </p>
                <p className="text-xs text-slate-600 font-medium">
                  {addr.city}, {addr.state} - {addr.postalCode}
                </p>
              </div>

              <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-100">
                {!addr.isDefault ? (
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1"
                  >
                    <Star className="w-3.5 h-3.5" /> Make Default
                  </button>
                ) : (
                  <div />
                )}
                <button
                  onClick={() => handleDelete(addr.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 bg-white shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Add New Address
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Full Name
                  </label>
                  <Input
                    required
                    placeholder="Contact Name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <Input
                    required
                    placeholder="+91..."
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Street Address
                </label>
                <Input
                  required
                  placeholder="Address Line 1"
                  value={formData.addressLine1}
                  onChange={(e) =>
                    setFormData({ ...formData, addressLine1: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    City
                  </label>
                  <Input
                    required
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    State
                  </label>
                  <Input
                    required
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Pincode
                  </label>
                  <Input
                    required
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData({ ...formData, postalCode: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="text-xs text-slate-700 font-medium flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) =>
                      setFormData({ ...formData, isDefault: e.target.checked })
                    }
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  Set as default address
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as any })
                  }
                  className="h-8 px-2 border border-slate-300 rounded text-xs bg-white"
                >
                  <option value="HOME">Home</option>
                  <option value="OFFICE">Office</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={actionLoading}
                  className="bg-sky-600 hover:bg-sky-500"
                >
                  {actionLoading ? "Saving..." : "Save Address"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AddressBookPage;
