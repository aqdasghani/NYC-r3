"use client";

import React, { useState, useEffect } from "react";
import { CornerDownLeft, Search, PlusCircle, Loader2, AlertCircle } from "lucide-react";
import apiClient from "@/lib/api-client";
import { Product } from "@/lib/backend-types";

type ReturnRecord = {
  id: string;
  order_id: string;
  customer: string;
  items: string;
  reason: string;
  refund: string;
  status: "COMPLETED" | "PENDING" | "REJECTED";
  date: string;
};

type BackendReturnOut = {
  id: string;
  pos_session_id?: string;
  product_id: string;
  quantity: number;
  reason?: string;
  status: string;
  created_at: string;
};

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [returnsData, productsData] = await Promise.all([
          apiClient.get<BackendReturnOut[]>("/api/returns/"),
          apiClient.get<{ items: Product[] }>("/api/inventory/products?page_size=200").then(r => r.items || [])
        ]);

        const productsMap = new Map<string, Product>();
        productsData.forEach(p => productsMap.set(p.id, p));

        const mappedReturns = returnsData.map(r => {
           const p = productsMap.get(r.product_id);
           const pName = p ? p.name : "Unknown Product";
           const pPrice = p ? (p.selling_price || 0) : 0;
           const refundValue = (pPrice * r.quantity / 100).toFixed(2);
           
           return {
             id: r.id.split("-")[0].toUpperCase(), // Short ID
             order_id: r.pos_session_id ? r.pos_session_id.split("-")[0].toUpperCase() : "N/A",
             customer: "Retail Customer", // We don't have customer in Return model directly
             items: `${pName} (${r.quantity} unit${r.quantity > 1 ? 's' : ''})`,
             reason: r.reason || "No reason provided",
             refund: `₹${refundValue}`,
             status: (r.status.toUpperCase() as any) || "PENDING",
             date: new Date(r.created_at).toISOString().split('T')[0]
           };
        });

        setReturns(mappedReturns);
      } catch (err: any) {
        setError(err.message || "Failed to load returns");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = returns.filter(
    (r) =>
      r.customer.toLowerCase().includes(search.toLowerCase()) ||
      r.order_id.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase())
  );

  const totalRefunds = returns.reduce((acc, r) => {
     return acc + parseFloat(r.refund.replace('₹', ''));
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)] text-red-500">
        <AlertCircle className="w-6 h-6 mr-2" /> {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans text-text-primary max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-default pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center shadow-sm">
            <CornerDownLeft className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Product Returns & Customer Refunds</h1>
            <p className="text-xs text-text-secondary">Track and authorize item returns, supplier chargebacks, and customer credit notes</p>
          </div>
        </div>

        <button className="px-4 py-2.5 bg-brand-green hover:bg-brand-green/90 text-black rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm self-start md:self-auto">
          <PlusCircle className="w-4 h-4" /> Process New Return
        </button>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search return ID, customer, or order..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-surface border border-border-default rounded-xl py-2.5 pl-9 pr-4 text-xs text-text-primary focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green transition-colors shadow-sm"
          />
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-text-secondary bg-bg-surface px-4 py-2.5 rounded-xl border border-border-default shadow-sm">
          <div>Total Processed: <span className="text-text-primary font-bold ml-1">{returns.length}</span></div>
          <div className="w-px h-4 bg-border-default mx-1"></div>
          <div>Total Refunds: <span className="text-amber-600 font-bold ml-1">₹{totalRefunds.toFixed(2)}</span></div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel p-1 bg-bg-surface border border-border-default rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-border-default text-text-muted font-bold uppercase tracking-wider text-[10px] bg-slate-50/50">
              <th className="py-4 px-4 rounded-tl-xl">Return ID</th>
              <th className="py-4 px-4">Order ID</th>
              <th className="py-4 px-4">Customer</th>
              <th className="py-4 px-4">Item Details</th>
              <th className="py-4 px-4">Reason</th>
              <th className="py-4 px-4 text-right">Refund</th>
              <th className="py-4 px-4">Status</th>
              <th className="py-4 px-4 rounded-tr-xl">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default/50 bg-white">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="py-4 px-4 font-mono font-bold text-text-primary">{r.id}</td>
                <td className="py-4 px-4 font-mono text-text-secondary">{r.order_id}</td>
                <td className="py-4 px-4 font-semibold text-text-primary">{r.customer}</td>
                <td className="py-4 px-4 text-text-primary">{r.items}</td>
                <td className="py-4 px-4 text-text-secondary">{r.reason}</td>
                <td className="py-4 px-4 font-mono font-bold text-amber-600 text-right">{r.refund}</td>
                <td className="py-4 px-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    r.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    r.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {r.status}
                  </span>
                </td>
                <td className="py-4 px-4 text-text-secondary">{r.date}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-text-muted">
                  No returns found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
