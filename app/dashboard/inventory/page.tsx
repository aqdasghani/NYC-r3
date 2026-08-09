"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Package, Archive, Clock, XCircle, TrendingDown, TrendingUp, RefreshCw } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { getToken } from "@/lib/api-client";

interface IntelligenceMetrics {
  count: number;
  value: number;
}

interface IntelligenceData {
  healthy: IntelligenceMetrics;
  low_stock: IntelligenceMetrics;
  overstock: IntelligenceMetrics;
  dead_stock: IntelligenceMetrics;
  near_expiry: IntelligenceMetrics;
  expired: IntelligenceMetrics;
}

interface SlowMover {
  product_name: string;
  category: string;
  stock: number;
  value: number;
  velocity: number;
  days_of_inventory: number;
}

interface FastMover {
  product_name: string;
  category: string;
  stock: number;
  velocity: number;
  revenue_14d: number;
}

export default function InventoryDashboard() {
  const [intel, setIntel] = useState<IntelligenceData | null>(null);
  const [slowMovers, setSlowMovers] = useState<SlowMover[]>([]);
  const [fastMovers, setFastMovers] = useState<FastMover[]>([]);
  
  const [loadingIntel, setLoadingIntel] = useState(true);
  const [loadingSlow, setLoadingSlow] = useState(true);
  const [loadingFast, setLoadingFast] = useState(true);

  const loadData = async () => {
    const token = getToken();
    const headers = { Authorization: `Bearer ${token}` };
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

    setLoadingIntel(true);
    setLoadingSlow(true);
    setLoadingFast(true);

    // Intelligence
    fetch(`${baseUrl}/api/inventory/intelligence`, { headers })
      .then(res => res.json())
      .then(data => {
        // If backend returns empty array or we get error, handle it
        if (data.healthy) {
          setIntel(data);
        } else {
          setIntel(null);
        }
      })
      .catch(() => setIntel(null))
      .finally(() => setLoadingIntel(false));

    // Slow Movers
    fetch(`${baseUrl}/api/inventory/slow-movers`, { headers })
      .then(res => res.json())
      .then(data => setSlowMovers(Array.isArray(data) ? data : []))
      .catch(() => setSlowMovers([]))
      .finally(() => setLoadingSlow(false));

    // Fast Movers
    fetch(`${baseUrl}/api/inventory/fast-movers`, { headers })
      .then(res => res.json())
      .then(data => setFastMovers(Array.isArray(data) ? data : []))
      .catch(() => setFastMovers([]))
      .finally(() => setLoadingFast(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time stock intelligence and movement analysis.</p>
        </div>
        <button onClick={loadData} className="glass-panel px-4 py-2 hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-semibold text-slate-700">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Intelligence Section */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4">Stock Intelligence</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Healthy */}
          <div className="glass-panel p-4 flex flex-col justify-between border-t-2 border-t-emerald-500">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Healthy</div>
            </div>
            {loadingIntel ? <div className="h-10 bg-slate-100 animate-pulse rounded" /> : (
              <div>
                <div className="text-2xl font-bold text-slate-900">{intel?.healthy?.count ?? 0}</div>
                <div className="text-xs text-slate-500 font-medium">{formatINR(intel?.healthy?.value ?? 0)} value</div>
              </div>
            )}
          </div>
          
          {/* Low Stock */}
          <div className="glass-panel p-4 flex flex-col justify-between border-t-2 border-t-amber-500">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Low Stock</div>
            </div>
            {loadingIntel ? <div className="h-10 bg-slate-100 animate-pulse rounded" /> : (
              <div>
                <div className="text-2xl font-bold text-slate-900">{intel?.low_stock?.count ?? 0}</div>
                <div className="text-xs text-slate-500 font-medium">{formatINR(intel?.low_stock?.value ?? 0)} value</div>
              </div>
            )}
          </div>

          {/* Overstock */}
          <div className="glass-panel p-4 flex flex-col justify-between border-t-2 border-t-blue-500">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-blue-500" />
              <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Overstock</div>
            </div>
            {loadingIntel ? <div className="h-10 bg-slate-100 animate-pulse rounded" /> : (
              <div>
                <div className="text-2xl font-bold text-slate-900">{intel?.overstock?.count ?? 0}</div>
                <div className="text-xs text-slate-500 font-medium">{formatINR(intel?.overstock?.value ?? 0)} value</div>
              </div>
            )}
          </div>

          {/* Dead Stock */}
          <div className="glass-panel p-4 flex flex-col justify-between border-t-2 border-t-slate-500">
            <div className="flex items-center gap-2 mb-2">
              <Archive className="w-4 h-4 text-slate-500" />
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Dead Stock</div>
            </div>
            {loadingIntel ? <div className="h-10 bg-slate-100 animate-pulse rounded" /> : (
              <div>
                <div className="text-2xl font-bold text-slate-900">{intel?.dead_stock?.count ?? 0}</div>
                <div className="text-xs text-slate-500 font-medium">{formatINR(intel?.dead_stock?.value ?? 0)} value</div>
              </div>
            )}
          </div>

          {/* Near Expiry */}
          <div className="glass-panel p-4 flex flex-col justify-between border-t-2 border-t-orange-500">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <div className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Near Expiry</div>
            </div>
            {loadingIntel ? <div className="h-10 bg-slate-100 animate-pulse rounded" /> : (
              <div>
                <div className="text-2xl font-bold text-slate-900">{intel?.near_expiry?.count ?? 0}</div>
                <div className="text-xs text-slate-500 font-medium">{formatINR(intel?.near_expiry?.value ?? 0)} value</div>
              </div>
            )}
          </div>

          {/* Expired */}
          <div className="glass-panel p-4 flex flex-col justify-between border-t-2 border-t-red-500">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <div className="text-xs font-semibold text-red-700 uppercase tracking-wider">Expired</div>
            </div>
            {loadingIntel ? <div className="h-10 bg-slate-100 animate-pulse rounded" /> : (
              <div>
                <div className="text-2xl font-bold text-slate-900">{intel?.expired?.count ?? 0}</div>
                <div className="text-xs text-slate-500 font-medium">{formatINR(intel?.expired?.value ?? 0)} value</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fast Movers Table */}
        <div className="glass-panel flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-800">Fast Movers</h2>
          </div>
          <div className="flex-1 overflow-x-auto">
            {loadingFast ? (
              <div className="p-8 flex justify-center"><div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>
            ) : fastMovers.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No fast movers data available.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-3 font-semibold">Product</th>
                    <th className="p-3 font-semibold">Category</th>
                    <th className="p-3 font-semibold text-right">Stock</th>
                    <th className="p-3 font-semibold text-right">Velocity</th>
                    <th className="p-3 font-semibold text-right">Rev (14d)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fastMovers.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-900">{m.product_name}</td>
                      <td className="p-3 text-slate-500">{m.category || '—'}</td>
                      <td className="p-3 text-right">{m.stock}</td>
                      <td className="p-3 text-right">{m.velocity.toFixed(1)}/d</td>
                      <td className="p-3 text-right font-medium">{formatINR(m.revenue_14d)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Slow Movers Table */}
        <div className="glass-panel flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-800">Slow Movers</h2>
          </div>
          <div className="flex-1 overflow-x-auto">
            {loadingSlow ? (
              <div className="p-8 flex justify-center"><div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>
            ) : slowMovers.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No slow movers data available.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-3 font-semibold">Product</th>
                    <th className="p-3 font-semibold">Category</th>
                    <th className="p-3 font-semibold text-right">Stock</th>
                    <th className="p-3 font-semibold text-right">Velocity</th>
                    <th className="p-3 font-semibold text-right">Days Inv</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {slowMovers.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-900">{m.product_name}</td>
                      <td className="p-3 text-slate-500">{m.category || '—'}</td>
                      <td className="p-3 text-right">{m.stock}</td>
                      <td className="p-3 text-right">{m.velocity.toFixed(2)}/d</td>
                      <td className="p-3 text-right font-medium text-amber-600">{m.days_of_inventory}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
