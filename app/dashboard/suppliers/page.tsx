"use client";

import React from "react";
import { 
  Users, Star, TrendingUp, AlertCircle, Phone, Mail, 
  MapPin, ShieldCheck, Clock, ExternalLink, ChevronRight 
} from "lucide-react";

const MOCK_SUPPLIERS = [
  { id: "SUP-001", name: "Green Valley Organics", contact: "Rajeev Singh", email: "orders@greenvalley.com", phone: "+91 98765 43210", rating: 4.8, fulfillment: 98, status: "Active", leadTime: "2 Days" },
  { id: "SUP-002", name: "Nature's Best FMCG", contact: "Priya Sharma", email: "sales@naturesbest.in", phone: "+91 87654 32109", rating: 4.2, fulfillment: 92, status: "Active", leadTime: "3 Days" },
  { id: "SUP-003", name: "Global Imports Co.", contact: "Amit Patel", email: "info@globalimports.com", phone: "+91 76543 21098", rating: 3.5, fulfillment: 85, status: "Under Review", leadTime: "7 Days" },
  { id: "SUP-004", name: "Fresh Farms Dairy", contact: "Sneha Reddy", email: "supply@freshfarms.in", phone: "+91 65432 10987", rating: 4.9, fulfillment: 99, status: "Active", leadTime: "1 Day" },
];

function SupplierCard({ title, value, sub, icon: Icon, colorClass, bgClass }: any) {
  return (
    <div className="glass-panel p-5 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-200">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgClass}`}>
          <Icon className={`w-6 h-6 ${colorClass}`} />
        </div>
        <div className="text-sm font-semibold text-slate-500">{title}</div>
      </div>
      <div>
        <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
        <div className="text-xs font-medium text-slate-500">{sub}</div>
      </div>
    </div>
  );
}

function PerformanceScore({ score }: { score: number }) {
  // Score out of 100
  const isGood = score >= 90;
  const isWarning = score >= 80 && score < 90;
  const isDanger = score < 80;

  const colorClass = isGood ? "text-green-500" : isWarning ? "text-orange-500" : "text-red-500";
  const bgClass = isGood ? "bg-green-50" : isWarning ? "bg-orange-50" : "bg-red-50";

  return (
    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${colorClass} ${bgClass} border border-white shadow-sm ring-1 ring-slate-100`}>
      {score}
    </div>
  );
}

export default function SuppliersPage() {
  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-blue" />
            Suppliers & Vendors
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage supplier relationships, track performance and fulfillments.</p>
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-semibold shadow-sm">
          Onboard Supplier
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SupplierCard title="Total Active" value="24" sub="↑ 2 new this month" icon={ShieldCheck} colorClass="text-blue-600" bgClass="bg-blue-100" />
        <SupplierCard title="Avg Fulfillment" value="94.2%" sub="Target: >95%" icon={TrendingUp} colorClass="text-green-600" bgClass="bg-green-100" />
        <SupplierCard title="Pending Orders" value="12" sub="From 8 suppliers" icon={Clock} colorClass="text-orange-600" bgClass="bg-orange-100" />
        <SupplierCard title="Issues/Delays" value="3" sub="Requires attention" icon={AlertCircle} colorClass="text-red-600" bgClass="bg-red-100" />
      </div>

      {/* Supplier Table */}
      <div className="glass-panel overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 className="text-base font-bold text-slate-800">Supplier Directory</h3>
          <button className="text-xs font-semibold text-brand-blue hover:text-blue-700 flex items-center gap-1 transition-colors">
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Supplier Details</th>
                <th className="px-6 py-4 font-semibold">Contact Info</th>
                <th className="px-6 py-4 font-semibold text-center">Fulfillment Score</th>
                <th className="px-6 py-4 font-semibold">Lead Time</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {MOCK_SUPPLIERS.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold">
                        {supplier.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{supplier.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          {supplier.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-800 mb-1">{supplier.contact}</div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Mail className="w-3 h-3" /> {supplier.email}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Phone className="w-3 h-3" /> {supplier.phone}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <PerformanceScore score={supplier.fulfillment} />
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium mt-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {supplier.rating}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                      <Clock className="w-3 h-3" /> {supplier.leadTime}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${
                      supplier.status === 'Active' 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-orange-50 text-orange-700 border-orange-200'
                    }`}>
                      {supplier.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-blue transition-colors px-3 py-1.5 hover:bg-blue-50 rounded-md">
                      Profile <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
