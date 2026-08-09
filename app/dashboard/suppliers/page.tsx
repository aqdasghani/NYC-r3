"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Users, Star, TrendingUp, AlertCircle, Phone, Mail, 
  MapPin, ShieldCheck, Clock, ExternalLink, ChevronRight,
  Loader2, Plus, Search, Filter, Trash2, Edit3, X, Building2, CheckCircle2
} from "lucide-react";
import { getSuppliers, getSupplierSummary, deleteSupplier, createSupplier } from "@/lib/api";
import { Supplier, SupplierSummary, SupplierCreate } from "@/lib/backend-types";

function SupplierCard({ title, value, sub, icon: Icon, colorClass, bgClass }: {
  title: string;
  value: string;
  sub: string;
  icon: any;
  colorClass: string;
  bgClass: string;
}) {
  return (
    <div className="glass-panel p-5 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-200">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgClass}`}>
          <Icon className={`w-6 h-6 ${colorClass}`} />
        </div>
        <div className="text-sm font-semibold text-text-secondary">{title}</div>
      </div>
      <div>
        <div className="text-3xl font-bold text-text-primary mb-1">{value}</div>
        <div className="text-xs font-medium text-text-secondary">{sub}</div>
      </div>
    </div>
  );
}

function PerformanceScore({ score }: { score: number }) {
  const isGood = score >= 90;
  const isWarning = score >= 80 && score < 90;

  const colorClass = isGood ? "text-green-600" : isWarning ? "text-orange-600" : "text-red-600";
  const bgClass = isGood ? "bg-green-50" : isWarning ? "bg-orange-50" : "bg-red-50";

  return (
    <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full font-bold text-xs ${colorClass} ${bgClass} border border-border-default shadow-xs`}>
      {score.toFixed(1)}%
    </div>
  );
}

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [summary, setSummary] = useState<SupplierSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Selected Supplier Profile View Modal
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Quick Onboard Modal State
  const [showQuickOnboardModal, setShowQuickOnboardModal] = useState(false);
  const [quickForm, setQuickForm] = useState<SupplierCreate>({
    name: "",
    contact_person: "",
    contact_phone: "",
    email: "",
    gst_number: "",
    category: "Produce & Fresh",
    payment_terms: "Net 30",
  });
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [suppData, sumData] = await Promise.all([
        getSuppliers(),
        getSupplierSummary(),
      ]);
      setSuppliers(suppData);
      setSummary(sumData);
    } catch (err: any) {
      setError(err.message || "Failed to load supplier directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove supplier "${name}"?`)) return;
    try {
      await deleteSupplier(id);
      if (selectedSupplier?.id === id) setSelectedSupplier(null);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete supplier");
    }
  };

  const handleQuickOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickForm.name.trim()) return;

    try {
      setQuickSubmitting(true);
      await createSupplier(quickForm);
      setShowQuickOnboardModal(false);
      setQuickForm({
        name: "",
        contact_person: "",
        contact_phone: "",
        email: "",
        gst_number: "",
        category: "Produce & Fresh",
        payment_terms: "Net 30",
      });
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to onboard supplier");
    } finally {
      setQuickSubmitting(false);
    }
  };

  // Filter logic
  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.contact_person && s.contact_person.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.gst_number && s.gst_number.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "ALL" || s.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(suppliers.map((s) => s.category).filter(Boolean))) as string[];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
        <p className="text-sm font-medium text-text-secondary">Loading real supplier telemetry & Directory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 glass-panel flex flex-col items-center text-center space-y-3 max-w-md mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <p className="text-base font-bold text-text-primary">Unable to load Suppliers</p>
        <p className="text-xs text-text-secondary">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-brand-green text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  const activeCount = summary ? summary.total_active : suppliers.length;
  const newThisMonth = summary ? summary.new_this_month : 0;
  const avgFulfillment = summary ? summary.avg_fulfillment : 95.0;
  const pendingOrders = summary ? summary.pending_orders_count : 0;
  const pendingSuppliers = summary ? summary.pending_orders_supplier_count : 0;
  const issuesDelays = summary ? summary.issues_delays_count : 0;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-green" />
            Suppliers & Vendors
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage vendor catalog, track fulfillment scores, and onboard new supplier relationships.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQuickOnboardModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-bg-surface border border-border-default text-text-primary rounded-lg hover:bg-slate-50 transition-colors text-sm font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4 text-brand-green" />
            Quick Add
          </button>
          <Link
            href="/dashboard/suppliers/onboard"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold shadow-sm"
          >
            <Building2 className="w-4 h-4" />
            Onboard Supplier
          </Link>
        </div>
      </div>

      {/* Real KPI Cards — Dynamic Data from DB */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SupplierCard
          title="Total Active"
          value={activeCount.toString()}
          sub={`↑ ${newThisMonth} new this month`}
          icon={ShieldCheck}
          colorClass="text-brand-green"
          bgClass="bg-green-100"
        />
        <SupplierCard
          title="Avg Fulfillment"
          value={`${avgFulfillment}%`}
          sub="Target: >95%"
          icon={TrendingUp}
          colorClass="text-brand-green"
          bgClass="bg-green-100"
        />
        <SupplierCard
          title="Pending Orders"
          value={pendingOrders.toString()}
          sub={`From ${pendingSuppliers} suppliers`}
          icon={Clock}
          colorClass="text-orange-600"
          bgClass="bg-orange-100"
        />
        <SupplierCard
          title="Issues/Delays"
          value={issuesDelays.toString()}
          sub="Requires attention"
          icon={AlertCircle}
          colorClass="text-red-600"
          bgClass="bg-red-100"
        />
      </div>

      {/* Supplier Directory Table Section */}
      <div className="glass-panel overflow-hidden space-y-0">
        {/* Table Filter Header */}
        <div className="p-4 border-b border-border-default flex flex-col md:flex-row md:items-center justify-between gap-4 bg-bg-surface">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-text-primary">Supplier Directory</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-xs font-semibold text-text-secondary">
              {filteredSuppliers.length} Total
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                placeholder="Search name, GST, contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-bg-surface border border-border-default rounded-lg text-xs text-text-primary focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green outline-none"
              />
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="relative w-full sm:w-48">
                <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-bg-surface border border-border-default rounded-lg text-xs text-text-primary focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green outline-none"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          {filteredSuppliers.length === 0 ? (
            <div className="p-12 text-center text-text-secondary space-y-3">
              <Building2 className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold">No suppliers found matching criteria.</p>
              <Link
                href="/dashboard/suppliers/onboard"
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-green text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                Onboard New Supplier
              </Link>
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-text-secondary border-b border-border-default text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Supplier Details</th>
                  <th className="px-6 py-4 font-semibold">Contact Info</th>
                  <th className="px-6 py-4 font-semibold text-center">Fulfillment Score</th>
                  <th className="px-6 py-4 font-semibold">Tax ID (GSTIN)</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default bg-bg-surface">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-green/10 text-brand-green font-bold flex items-center justify-center text-base shrink-0">
                          {supplier.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-text-primary flex items-center gap-2">
                            {supplier.name}
                          </div>
                          <div className="text-xs text-text-secondary flex items-center gap-2 mt-0.5">
                            {supplier.category && (
                              <span className="px-2 py-0.5 bg-slate-100 text-[11px] font-medium rounded-md text-text-secondary">
                                {supplier.category}
                              </span>
                            )}
                            <span>{supplier.payment_terms || "Net 30"}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {supplier.contact_person && (
                          <span className="text-xs font-semibold text-text-primary">
                            {supplier.contact_person}
                          </span>
                        )}
                        <span className="text-xs text-text-secondary flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-text-secondary" /> {supplier.email || "N/A"}
                        </span>
                        <span className="text-xs text-text-secondary flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-text-secondary" /> {supplier.contact_phone || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <PerformanceScore score={supplier.on_time_delivery_score || 95} />
                        <div className="flex items-center gap-1 text-[10px] text-text-secondary font-medium mt-0.5">
                          <Star className="w-3 h-3 text-brand-green fill-brand-green" /> Expiry Score: {supplier.expiry_quality_score || 98}%
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-text-primary text-xs font-mono font-semibold">
                        {supplier.gst_number || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedSupplier(supplier)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-brand-green transition-colors px-3 py-1.5 hover:bg-green-50 rounded-md border border-border-default"
                      >
                        Profile <ExternalLink className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteSupplier(supplier.id, supplier.name)}
                        className="p-1.5 text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete Supplier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Supplier Profile Detail Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bg-surface border border-border-default rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-border-default">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-brand-green/10 text-brand-green font-bold text-xl flex items-center justify-center">
                  {selectedSupplier.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">{selectedSupplier.name}</h3>
                  <p className="text-xs text-text-secondary">GSTIN: {selectedSupplier.gst_number || "Unregistered"}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSupplier(null)}
                className="p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 space-y-1">
                <span className="text-text-secondary font-semibold">Contact Person</span>
                <p className="font-bold text-text-primary">{selectedSupplier.contact_person || "N/A"}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 space-y-1">
                <span className="text-text-secondary font-semibold">Category</span>
                <p className="font-bold text-text-primary">{selectedSupplier.category || "General Wholesale"}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 space-y-1">
                <span className="text-text-secondary font-semibold">Phone</span>
                <p className="font-bold text-text-primary">{selectedSupplier.contact_phone || "N/A"}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 space-y-1">
                <span className="text-text-secondary font-semibold">Email</span>
                <p className="font-bold text-text-primary">{selectedSupplier.email || "N/A"}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 space-y-1">
                <span className="text-text-secondary font-semibold">Payment Terms</span>
                <p className="font-bold text-text-primary">{selectedSupplier.payment_terms || "Net 30"}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 space-y-1">
                <span className="text-text-secondary font-semibold">Lead Time</span>
                <p className="font-bold text-text-primary">{selectedSupplier.lead_time_days || 2} Days</p>
              </div>
            </div>

            {selectedSupplier.address && (
              <div className="p-3 rounded-xl bg-slate-50 space-y-1 text-xs">
                <span className="text-text-secondary font-semibold flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Address
                </span>
                <p className="font-medium text-text-primary">{selectedSupplier.address}</p>
              </div>
            )}

            {selectedSupplier.notes && (
              <div className="p-3 rounded-xl bg-slate-50 space-y-1 text-xs">
                <span className="text-text-secondary font-semibold">Internal Notes</span>
                <p className="font-medium text-text-primary">{selectedSupplier.notes}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-border-default">
              <button
                onClick={() => handleDeleteSupplier(selectedSupplier.id, selectedSupplier.name)}
                className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove Supplier
              </button>

              <button
                onClick={() => setSelectedSupplier(null)}
                className="px-4 py-2 rounded-lg bg-bg-surface border border-border-default text-text-primary text-xs font-semibold hover:bg-slate-100"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Onboard Modal */}
      {showQuickOnboardModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bg-surface border border-border-default rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand-green" /> Quick Onboard Supplier
              </h3>
              <button
                onClick={() => setShowQuickOnboardModal(false)}
                className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickOnboardSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-text-secondary">Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mahavir Foods Wholesale"
                  value={quickForm.name}
                  onChange={(e) => setQuickForm({ ...quickForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border-default rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-green/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-text-secondary">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Anand Sharma"
                    value={quickForm.contact_person}
                    onChange={(e) => setQuickForm({ ...quickForm, contact_person: e.target.value })}
                    className="w-full px-3 py-2 border border-border-default rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-green/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-text-secondary">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98200 12345"
                    value={quickForm.contact_phone}
                    onChange={(e) => setQuickForm({ ...quickForm, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-border-default rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-green/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-text-secondary">Email</label>
                  <input
                    type="email"
                    placeholder="sales@mahavir.com"
                    value={quickForm.email}
                    onChange={(e) => setQuickForm({ ...quickForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-border-default rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-green/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-text-secondary">GSTIN</label>
                  <input
                    type="text"
                    placeholder="27ABCDE1234F1Z5"
                    value={quickForm.gst_number}
                    onChange={(e) => setQuickForm({ ...quickForm, gst_number: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-border-default rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-green/30 uppercase font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
                <button
                  type="button"
                  onClick={() => setShowQuickOnboardModal(false)}
                  className="px-4 py-2 rounded-lg border border-border-default text-text-primary text-xs font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickSubmitting}
                  className="px-5 py-2 rounded-lg bg-brand-green text-white text-xs font-semibold hover:bg-green-700 transition-colors flex items-center gap-1.5"
                >
                  {quickSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
