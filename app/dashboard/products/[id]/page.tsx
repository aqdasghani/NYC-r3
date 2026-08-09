"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Package, IndianRupee, TrendingUp, 
  Clock, Calendar, AlertTriangle, CheckCircle2 
} from "lucide-react";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from "recharts";
import { getProduct, getProductDemand, getActions, getBatches } from "@/lib/api";
import type { ProductOut, ActionOut, BatchOut } from "@/lib/backend-types";
import type { ProductDemand } from "@/lib/backend-types";
import { formatINR } from "@/lib/utils";
import { GlassCard } from "@/components/ui/GlassCard";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [product, setProduct] = useState<ProductOut | null>(null);
  const [demand, setDemand] = useState<ProductDemand | null>(null);
  const [actions, setActions] = useState<ActionOut[]>([]);
  const [batches, setBatches] = useState<BatchOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [prod, dem, allActions, allBatches] = await Promise.all([
          getProduct(id),
          getProductDemand(id),
          getActions("PENDING"),
          getBatches()
        ]);
        
        setProduct(prod);
        setDemand(dem);
        setActions(allActions.filter((a: ActionOut) => a.product_id === id));
        setBatches(allBatches.filter((b: BatchOut) => b.product_id === id));
      } catch (err) {
        console.error("Failed to load product details", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return <div className="p-12 text-center text-text-secondary animate-pulse">Loading product analytics...</div>;
  }

  if (!product) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-xl font-bold">Product not found</h2>
        <Link href="/dashboard/products" className="text-brand-green hover:underline mt-4 inline-block">
          Return to Inventory
        </Link>
      </div>
    );
  }

  const totalStock = batches.reduce((sum, b) => sum + b.quantity, 0);
  const margin = product.selling_price && product.purchase_price 
    ? ((product.selling_price - product.purchase_price) / product.selling_price) * 100 
    : 0;

  let stockStatus = "In Stock";
  let stockColor = "bg-green-100 text-green-800 border-green-200";
  if (totalStock === 0) {
    stockStatus = "Out of Stock";
    stockColor = "bg-red-100 text-red-800 border-red-200";
  } else if (totalStock < 20) { // arbitrary low stock threshold
    stockStatus = "Low Stock";
    stockColor = "bg-amber-100 text-amber-800 border-amber-200";
  }

  const maxDow = demand?.dow_pattern ? Math.max(...demand.dow_pattern.map((d: any) => d.units)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/products" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-brand-green mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Inventory
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Product Analytics</h1>
      </div>

      <GlassCard className="p-6">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-slate-800">{product.name}</h2>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${stockColor}`}>
                {stockStatus}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1"><Package className="w-4 h-4" /> {product.category || "Uncategorized"}</span>
              <span>SKU: {product.sku || "N/A"}</span>
              <span>Barcode: {product.barcode || "N/A"}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div className="text-slate-500">Selling Price:</div>
            <div className="font-semibold text-slate-800 text-right">{formatINR(product.selling_price || 0)}</div>
            <div className="text-slate-500">Purchase Price:</div>
            <div className="font-semibold text-slate-800 text-right">{formatINR(product.purchase_price || 0)}</div>
            <div className="text-slate-500">Current Stock:</div>
            <div className="font-semibold text-slate-800 text-right">{totalStock} units</div>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-brand-green" /> Revenue (30d)
          </div>
          <div className="text-2xl font-bold text-slate-800">{formatINR(demand?.total_revenue_30d || 0)}</div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-500" /> Units Sold (30d)
          </div>
          <div className="text-2xl font-bold text-slate-800">{demand?.total_units_30d || 0}</div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" /> Velocity
          </div>
          <div className="text-2xl font-bold text-slate-800">{demand?.velocity_per_day?.toFixed(1) || 0} <span className="text-sm font-normal text-slate-500">/day</span></div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-500" /> Margin
          </div>
          <div className="text-2xl font-bold text-slate-800">{margin.toFixed(1)}%</div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Sales This Month</h3>
          <div className="h-64 w-full">
            {demand?.daily_series?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={demand.daily_series}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tickFormatter={(v) => v.split('-').slice(1).join('/')} stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`${value} units`, "Sold"]}
                    labelFormatter={(label: any) => `Date: ${label}`}
                  />
                  <Line type="monotone" dataKey="units" stroke="#0FA958" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">No daily sales data</div>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Hourly Demand Pattern</h3>
          <div className="h-64 w-full">
            {demand?.hourly_pattern?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demand.hourly_pattern}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="hour" tickFormatter={(v) => `${v}:00`} stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`${value} units`, "Average"]}
                    labelFormatter={(label: any) => `Time: ${label}:00`}
                  />
                  <Bar dataKey="units" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">No hourly data</div>
            )}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Day of Week Demand</h3>
        <div className="h-64 w-full">
          {demand?.dow_pattern?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demand.dow_pattern}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`${value} units`, "Sold"] as [string, string]}
                />
                <Bar dataKey="units" radius={[4, 4, 0, 0]}>
                  {demand.dow_pattern.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.units === maxDow && maxDow > 0 ? '#0FA958' : '#cbd5e1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">No day of week data</div>
          )}
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Batch Information</h3>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Batch #</th>
                  <th className="px-4 py-3">Expiry Date</th>
                  <th className="px-4 py-3">Days Left</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No batches found</td></tr>
                ) : (
                  batches.map(b => {
                    let color = "text-slate-800";
                    if (b.days_remaining < 7) color = "text-red-600 font-semibold";
                    else if (b.days_remaining < 14) color = "text-amber-600 font-medium";
                    
                    return (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{b.batch_number || "N/A"}</td>
                        <td className="px-4 py-3 text-slate-600">{b.expiry_date}</td>
                        <td className={`px-4 py-3 ${color}`}>{b.days_remaining}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">{b.quantity}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">AI Actions</h3>
          {actions.length === 0 ? (
            <GlassCard className="p-6 text-center border-dashed border-2">
              <CheckCircle2 className="w-8 h-8 text-brand-green mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No pending actions for this product.</p>
            </GlassCard>
          ) : (
            actions.map(action => (
              <GlassCard key={action.id} className="p-4 border-l-4 border-l-amber-500">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                    {action.risk_type}
                  </span>
                  <span className="text-sm font-semibold text-red-600">
                    {formatINR(action.value_at_risk || 0)}
                  </span>
                </div>
                <p className="text-sm text-slate-700 mb-3">
                  {action.recommendations?.[0]?.reasoning || "Intervention required"}
                </p>
                <Link href="/dashboard/actions" className="text-sm font-medium text-brand-green hover:underline flex items-center gap-1">
                  View in Action Engine <ArrowLeft className="w-3 h-3 rotate-180" />
                </Link>
              </GlassCard>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
