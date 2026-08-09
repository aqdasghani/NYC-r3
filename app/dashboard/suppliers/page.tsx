"use client";
import RoleGate from '@/components/layout/RoleGate';


import React, { useState, useEffect } from "react";
import { 
  Users, Star, TrendingUp, AlertCircle, Phone, Mail, 
  MapPin, ShieldCheck, Clock, ExternalLink, ChevronRight 
} from "lucide-react";
import { getSuppliers } from "@/lib/api";
import type { SupplierOut } from "@/lib/backend-types";

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

function SuppliersPageContent() {
  const [suppliers, setSuppliers] = useState<SupplierOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getSuppliers();
        setSuppliers(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
                <th className="px-6 py-4 font-semibold">Quality Score</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-10 w-48 bg-slate-200 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-10 w-32 bg-slate-200 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-10 w-10 bg-slate-200 rounded-full mx-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-6 w-20 bg-slate-200 rounded"></div></td>
                    <td className="px-6 py-4 text-right"></td>
                  </tr>
                ))
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No suppliers added yet.
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold">
                          {supplier.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{supplier.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            {supplier.id} {supplier.gst_number ? `· GST: ${supplier.gst_number}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Mail className="w-3 h-3" /> {supplier.email || '-'}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Phone className="w-3 h-3" /> {supplier.contact_phone || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <PerformanceScore score={Math.round((supplier.on_time_delivery_score || 0) * 100)} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {Math.round((supplier.expiry_quality_score || 0) * 100)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-blue transition-colors px-3 py-1.5 hover:bg-blue-50 rounded-md">
                        Profile <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


export default function SuppliersPage() {
  return (
    <RoleGate module="suppliers">
      <SuppliersPageContent />
    </RoleGate>
  );
}
