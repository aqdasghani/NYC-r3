'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";

import { apiFetch } from "@/lib/api-client";

const formatINR = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'sales' | 'inventory' | 'profit' | 'gst' | 'expiry' | 'waste' | 'products' | 'suppliers'>('sales');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0]; // first of current month
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  const fetchReport = useCallback(async (tab: string, params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch<any>(`/api/reports/${tab}?${qs}`);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = {};
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;
    if (category) params.category = category;
    fetchReport(activeTab, params)
      .then(data => { setReportData(data); setLoading(false); })
      .catch(err => { setError(err.message || "Failed to load report"); setLoading(false); });
  }, [activeTab, fromDate, toDate, category, fetchReport]);

  useEffect(() => {
    apiFetch<any>("/api/inventory/products?page_size=200")
      .then(data => {
        const cats = [...new Set((data.items || []).map((p: any) => p.category).filter(Boolean))] as string[];
        setCategories(cats);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900">Reports</h2>
          <div className="flex flex-wrap items-center gap-2">
            {/* Date range */}
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <span className="text-slate-400 text-sm">to</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            {/* Category filter */}
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {/* Preset buttons */}
            {['Today', 'This Week', 'This Month', 'Last 3M'].map(preset => (
              <button key={preset}
                onClick={() => {
                  const today = new Date();
                  const to = today.toISOString().split('T')[0];
                  let from = to;
                  if (preset === 'This Week') { const d = new Date(today); d.setDate(today.getDate() - today.getDay()); from = d.toISOString().split('T')[0]; }
                  else if (preset === 'This Month') { from = today.toISOString().split('T')[0].replace(/-\d+$/, '-01'); }
                  else if (preset === 'Last 3M') { const d = new Date(today); d.setMonth(today.getMonth() - 3); from = d.toISOString().split('T')[0]; }
                  setFromDate(from); setToDate(to);
                }}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                {preset}
              </button>
            ))}
            {/* Export CSV */}
            <button
              onClick={async () => {
                if (!reportData) return;
                const csv = [JSON.stringify(reportData)].join('');
                const blob = new Blob([csv], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `${activeTab}_report_${fromDate}_${toDate}.json`;
                a.click();
              }}
              className="flex items-center gap-2 bg-[#0FA958] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-600 transition-colors">
              ⬇ Export
            </button>
          </div>
        </div>

        {/* Tab bar — scrollable on mobile */}
        <div className="flex gap-1 overflow-x-auto pb-1 border-b border-slate-200">
          {(['sales', 'inventory', 'profit', 'gst', 'expiry', 'waste', 'products', 'suppliers'] as const).map(tab => (
            <button key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-semibold whitespace-nowrap rounded-t-lg transition-colors ${
                activeTab === tab ? 'bg-[#0FA958] text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">Loading report data...</div>
      ) : error ? (
        <div className="text-red-500 p-6 bg-red-50 rounded-xl">Error: {error}</div>
      ) : reportData ? (
        <ReportContent activeTab={activeTab} reportData={reportData} />
      ) : null}
    </div>
  );
}

function ReportContent({ activeTab, reportData }: { activeTab: string, reportData: any }) {
  if (!reportData) return null;

  if (activeTab === 'sales') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total Revenue" value={formatINR(reportData.summary?.total_revenue || 0)} />
          <StatCard title="Units" value={reportData.summary?.total_units || 0} />
          <StatCard title="GST" value={formatINR(reportData.summary?.total_gst || 0)} />
          <StatCard title="Transactions" value={reportData.summary?.total_transactions || 0} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Daily Revenue">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={reportData.daily || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(val) => `₹${val}`} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#0FA958" fill="#0FA958" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
            {(!reportData.daily || reportData.daily.length === 0) && <div className="text-center text-slate-500 mt-4">No data for selected period</div>}
          </ChartCard>
          <ChartCard title="Revenue by Category">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={reportData.by_category || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="category" />
                <YAxis tickFormatter={(val) => `₹${val}`} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#0FA958" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {(!reportData.by_category || reportData.by_category.length === 0) && <div className="text-center text-slate-500 mt-4">No data for selected period</div>}
          </ChartCard>
        </div>
      </div>
    );
  }

  if (activeTab === 'inventory') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard title="Total Value" value={formatINR(reportData.total_inventory_value || 0)} />
          <StatCard title="Total Units" value={reportData.total_units || 0} />
        </div>
        <ChartCard title="Inventory Value by Category">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={reportData.by_category || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="category" />
              <YAxis tickFormatter={(val) => `₹${val}`} />
              <Tooltip />
              <Bar dataKey="total_value" stackId="a" fill="#3B82F6" name="Total Value" />
              <Bar dataKey="near_expiry_value" stackId="a" fill="#F59E0B" name="Near Expiry Value" />
            </BarChart>
          </ResponsiveContainer>
          {(!reportData.by_category || reportData.by_category.length === 0) && <div className="text-center text-slate-500 mt-4">No data for selected period</div>}
        </ChartCard>
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-3 font-semibold">Category</th>
                <th className="p-3 font-semibold">Value</th>
                <th className="p-3 font-semibold">Units</th>
                <th className="p-3 font-semibold">Near-Expiry Value</th>
              </tr>
            </thead>
            <tbody>
              {(reportData.by_category || []).map((cat: any, i: number) => (
                <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="p-3 font-medium">{cat.category}</td>
                  <td className="p-3">{formatINR(cat.total_value || 0)}</td>
                  <td className="p-3">{cat.units || 0}</td>
                  <td className="p-3 text-orange-600">{formatINR(cat.near_expiry_value || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!reportData.by_category || reportData.by_category.length === 0) && <div className="text-center text-slate-500 p-4">No data for selected period</div>}
        </div>
      </div>
    );
  }

  if (activeTab === 'profit') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Revenue" value={formatINR(reportData.summary?.total_revenue || 0)} />
          <StatCard title="COGS" value={formatINR(reportData.summary?.total_cogs || 0)} />
          <StatCard title="Gross Profit" value={reportData.summary?.total_profit == null ? "—" : formatINR(reportData.summary.total_profit)} />
          <StatCard title="Margin %" value={reportData.summary?.gross_margin_pct == null ? "—" : `${reportData.summary.gross_margin_pct.toFixed(1)}%`} />
        </div>
        <ChartCard title="Daily Profit & Revenue">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={reportData.daily || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(val) => `₹${val}`} />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#0FA958" fill="#0FA958" fillOpacity={0.1} name="Revenue" />
              <Area type="monotone" dataKey="profit" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} name="Profit" />
            </AreaChart>
          </ResponsiveContainer>
          {(!reportData.daily || reportData.daily.length === 0) && <div className="text-center text-slate-500 mt-4">No data for selected period</div>}
        </ChartCard>
      </div>
    );
  }

  if (activeTab === 'gst') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          <StatCard title="Total GST Collected" value={formatINR(reportData.summary?.total_gst || 0)} />
        </div>
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-3 font-semibold">Rate %</th>
                <th className="p-3 font-semibold">Taxable Amount</th>
                <th className="p-3 font-semibold">GST Collected</th>
                <th className="p-3 font-semibold">Transactions</th>
              </tr>
            </thead>
            <tbody>
              {(reportData.by_rate || []).map((rate: any, i: number) => (
                <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="p-3 font-medium">{rate.rate_percent}%</td>
                  <td className="p-3">{formatINR(rate.taxable_amount || 0)}</td>
                  <td className="p-3">{formatINR(rate.gst_collected || 0)}</td>
                  <td className="p-3">{rate.transaction_count || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!reportData.by_rate || reportData.by_rate.length === 0) && <div className="text-center text-slate-500 p-4">No data for selected period</div>}
        </div>
      </div>
    );
  }

  if (activeTab === 'expiry') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Value at Risk" value={formatINR(reportData.summary?.value_at_risk || 0)} />
          <StatCard title="Expired Value" value={formatINR(reportData.summary?.expired_value || 0)} />
          <StatCard title="Critical Value" value={formatINR(reportData.summary?.critical_value || 0)} />
        </div>
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-3 font-semibold">Product</th>
                <th className="p-3 font-semibold">Batch</th>
                <th className="p-3 font-semibold">Qty</th>
                <th className="p-3 font-semibold">Expiry Date</th>
                <th className="p-3 font-semibold">Days Left</th>
                <th className="p-3 font-semibold">Value</th>
                <th className="p-3 font-semibold">Tier</th>
              </tr>
            </thead>
            <tbody>
              {(reportData.items || []).map((item: any, i: number) => {
                let rowClass = '';
                if (item.tier === 'expired') rowClass = 'bg-red-50 text-red-900';
                else if (item.tier === 'critical') rowClass = 'bg-orange-50 text-orange-900';
                else if (item.tier === 'warning') rowClass = 'bg-amber-50 text-amber-900';
                
                return (
                  <tr key={i} className={`border-b border-slate-100 last:border-0 ${rowClass}`}>
                    <td className="p-3 font-medium">{item.product_name}</td>
                    <td className="p-3">{item.batch_code}</td>
                    <td className="p-3">{item.qty}</td>
                    <td className="p-3">{item.expiry_date}</td>
                    <td className="p-3">{item.days_left}</td>
                    <td className="p-3">{formatINR(item.value || 0)}</td>
                    <td className="p-3 uppercase text-xs font-bold">{item.tier}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(!reportData.items || reportData.items.length === 0) && <div className="text-center text-slate-500 p-4">No data for selected period</div>}
        </div>
      </div>
    );
  }

  if (activeTab === 'waste') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard title="Prevented Waste" value={formatINR(reportData.summary?.prevented || 0)} />
          <StatCard title="Actual Waste" value={formatINR(reportData.summary?.actual || 0)} />
        </div>
        <ChartCard title="Waste Prevention Trend">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={reportData.series || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(val) => `₹${val}`} />
              <Tooltip />
              <Bar dataKey="prevented" stackId="a" fill="#0FA958" name="Prevented Waste" />
              <Bar dataKey="actual" stackId="a" fill="#EF4444" name="Actual Waste" />
            </BarChart>
          </ResponsiveContainer>
          {(!reportData.series || reportData.series.length === 0) && <div className="text-center text-slate-500 mt-4">No data for selected period</div>}
        </ChartCard>
      </div>
    );
  }

  if (activeTab === 'products') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          <StatCard title="Total Products Sold" value={reportData.summary?.total_products || 0} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
            <h3 className="p-4 font-bold border-b border-slate-200">Top 10 Products</h3>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="p-3 font-semibold">Name</th>
                  <th className="p-3 font-semibold">Category</th>
                  <th className="p-3 font-semibold">Revenue</th>
                  <th className="p-3 font-semibold">Units</th>
                </tr>
              </thead>
              <tbody>
                {(reportData.top_10 || []).map((p: any, i: number) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3">{p.category}</td>
                    <td className="p-3 text-green-600">{formatINR(p.revenue || 0)}</td>
                    <td className="p-3">{p.units}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!reportData.top_10 || reportData.top_10.length === 0) && <div className="text-center text-slate-500 p-4">No data for selected period</div>}
          </div>
          <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
            <h3 className="p-4 font-bold border-b border-slate-200">Bottom 10 Products</h3>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="p-3 font-semibold">Name</th>
                  <th className="p-3 font-semibold">Category</th>
                  <th className="p-3 font-semibold">Revenue</th>
                  <th className="p-3 font-semibold">Units</th>
                </tr>
              </thead>
              <tbody>
                {(reportData.bottom_10 || []).map((p: any, i: number) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3">{p.category}</td>
                    <td className="p-3 text-red-500">{formatINR(p.revenue || 0)}</td>
                    <td className="p-3">{p.units}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!reportData.bottom_10 || reportData.bottom_10.length === 0) && <div className="text-center text-slate-500 p-4">No data for selected period</div>}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'suppliers') {
    return (
      <div className="space-y-6">
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-3 font-semibold">Supplier</th>
                <th className="p-3 font-semibold">Products</th>
                <th className="p-3 font-semibold">Stock Value</th>
                <th className="p-3 font-semibold">Units</th>
              </tr>
            </thead>
            <tbody>
              {(reportData.items || []).map((s: any, i: number) => (
                <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="p-3 font-medium">{s.supplier}</td>
                  <td className="p-3">{s.product_count}</td>
                  <td className="p-3">{formatINR(s.stock_value || 0)}</td>
                  <td className="p-3">{s.units}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!reportData.items || reportData.items.length === 0) && <div className="text-center text-slate-500 p-4">No data for selected period</div>}
        </div>
      </div>
    );
  }

  return null;
}

function StatCard({ title, value }: { title: string, value: string | number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-500 mb-2">{title}</h3>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 mb-6">{title}</h3>
      <div className="h-[240px]">
        {children}
      </div>
    </div>
  );
}
