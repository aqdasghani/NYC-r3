"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, User, Phone, Mail, FileText, MapPin, Clock, 
  CreditCard, Tag, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Save
} from "lucide-react";
import { createSupplier } from "@/lib/api";
import { SupplierCreate } from "@/lib/backend-types";

export default function OnboardSupplierPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState<SupplierCreate>({
    name: "",
    contact_person: "",
    contact_phone: "",
    email: "",
    gst_number: "",
    category: "Produce & Fresh",
    address: "",
    payment_terms: "Net 30",
    lead_time_days: 2,
    notes: "",
  });

  const categories = [
    "Produce & Fresh",
    "Dairy & Cold Chain",
    "Beverages & Juices",
    "Packaged Foods & Snacks",
    "Grains, Spices & Staples",
    "Bakery & Confectionery",
    "Meat & Seafood",
    "Personal Care & Household",
    "General Wholesale",
  ];

  const paymentTermsOptions = [
    "COD (Cash on Delivery)",
    "Net 7 Days",
    "Net 15 Days",
    "Net 30 Days",
    "Prepaid",
    "Weekly Settlement",
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "lead_time_days" ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Supplier / Company name is required");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await createSupplier(formData);
      setSuccessMsg("Supplier onboarded successfully! Redirecting...");
      setTimeout(() => {
        router.push("/dashboard/suppliers");
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to onboard supplier. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/dashboard/suppliers")}
            className="p-2 rounded-lg bg-bg-surface border border-border-default hover:bg-slate-100 transition-colors text-text-secondary"
            title="Back to Suppliers"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <Building2 className="w-6 h-6 text-brand-green" />
              Onboard New Supplier
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Register a new vendor, configure lead times, payment terms, and GST details for automated procurement.
            </p>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 text-sm font-medium">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3 text-green-800 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic & Company Info */}
        <div className="glass-panel p-6 space-y-4">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2 pb-2 border-b border-border-default">
            <Building2 className="w-4 h-4 text-brand-green" />
            Company & Business Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">
                Supplier / Company Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. GreenFarm Organics Pvt Ltd"
                  required
                  className="w-full px-3.5 py-2.5 bg-bg-surface border border-border-default rounded-lg text-sm text-text-primary focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">Category</label>
              <div className="relative">
                <select
                  name="category"
                  value={formData.category || ""}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-bg-surface border border-border-default rounded-lg text-sm text-text-primary focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">GSTIN / Tax Registration ID</label>
              <div className="relative">
                <input
                  type="text"
                  name="gst_number"
                  value={formData.gst_number || ""}
                  onChange={handleChange}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  className="w-full px-3.5 py-2.5 bg-bg-surface border border-border-default rounded-lg text-sm text-text-primary uppercase tracking-wider font-mono focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">Payment Terms</label>
              <div className="relative">
                <select
                  name="payment_terms"
                  value={formData.payment_terms || ""}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-bg-surface border border-border-default rounded-lg text-sm text-text-primary focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green outline-none"
                >
                  {paymentTermsOptions.map((term) => (
                    <option key={term} value={term}>
                      {term}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Primary Contact Info */}
        <div className="glass-panel p-6 space-y-4">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2 pb-2 border-b border-border-default">
            <User className="w-4 h-4 text-brand-green" />
            Contact Person & Communication
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">Contact Person Name</label>
              <div className="relative">
                <input
                  type="text"
                  name="contact_person"
                  value={formData.contact_person || ""}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2.5 bg-bg-surface border border-border-default rounded-lg text-sm text-text-primary focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">Phone Number</label>
              <div className="relative">
                <input
                  type="tel"
                  name="contact_phone"
                  value={formData.contact_phone || ""}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 bg-bg-surface border border-border-default rounded-lg text-sm text-text-primary focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email || ""}
                  onChange={handleChange}
                  placeholder="orders@greenfarm.in"
                  className="w-full px-3.5 py-2.5 bg-bg-surface border border-border-default rounded-lg text-sm text-text-primary focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Fulfillment & Notes */}
        <div className="glass-panel p-6 space-y-4">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2 pb-2 border-b border-border-default">
            <Clock className="w-4 h-4 text-brand-green" />
            Fulfillment SLA & Warehouse Address
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-xs font-semibold text-text-secondary">Expected Lead Time (Days)</label>
              <div className="relative">
                <input
                  type="number"
                  name="lead_time_days"
                  min="1"
                  max="60"
                  value={formData.lead_time_days}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-bg-surface border border-border-default rounded-lg text-sm text-text-primary focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green outline-none"
                />
              </div>
              <p className="text-[11px] text-text-secondary">Average days from order placement to delivery</p>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-text-secondary">Warehouse / Dispatch Address</label>
              <input
                type="text"
                name="address"
                value={formData.address || ""}
                onChange={handleChange}
                placeholder="Plot 42, Wholesale APMC Market, Sector 19, Vashi, Navi Mumbai"
                className="w-full px-3.5 py-2.5 bg-bg-surface border border-border-default rounded-lg text-sm text-text-primary focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-text-secondary">Notes & Internal Agreement Details</label>
            <textarea
              name="notes"
              rows={3}
              value={formData.notes || ""}
              onChange={handleChange}
              placeholder="e.g. Primary organic dairy vendor. Expiry return policy applies within 5 days of dispatch."
              className="w-full px-3.5 py-2.5 bg-bg-surface border border-border-default rounded-lg text-sm text-text-primary focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green outline-none resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/dashboard/suppliers")}
            className="px-5 py-2.5 rounded-lg border border-border-default bg-bg-surface text-text-primary text-sm font-semibold hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-green hover:bg-green-700 text-white text-sm font-semibold transition-colors shadow-md disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving Supplier...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save & Onboard Supplier
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
