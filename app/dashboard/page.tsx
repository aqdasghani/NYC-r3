"use client";

import React from 'react';
import { 
  Briefcase, ShoppingBag, AlertTriangle, XCircle, Leaf, 
  TrendingUp, Bell, ArrowRightLeft, ShoppingCart, Users, CheckCircle2, ChevronRight, Package 
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';

// Mock Data
const inventoryData = [
  { name: 'Good Stock', value: 1012, color: '#10B981' },
  { name: 'Near Expiry', value: 37, color: '#F59E0B' },
  { name: 'Expired', value: 8, color: '#EF4444' },
  { name: 'Low Stock', value: 21, color: '#3B82F6' },
  { name: 'Overstock', value: 14, color: '#8B5CF6' },
  { name: 'Dead Stock', value: 192, color: '#94A3B8' },
];

const salesData = [
  { name: '01 May', value: 22000 },
  { name: '07 May', value: 28000 },
  { name: '14 May', value: 45000 },
  { name: '21 May', value: 38000 },
  { name: '28 May', value: 65420 },
];

const expiryTimelineData = [
  { name: '0 - 3 Days', items: 8, value: '₹2,160', fill: '#EF4444', width: '20%' },
  { name: '4 - 7 Days', items: 14, value: '₹6,320', fill: '#F59E0B', width: '35%' },
  { name: '8 - 15 Days', items: 15, value: '₹7,540', fill: '#FCD34D', width: '40%' },
  { name: '16 - 30 Days', items: 22, value: '₹9,850', fill: '#34D399', width: '55%' },
  { name: '30+ Days', items: 1225, value: '₹4,56,470', fill: '#0FA958', width: '90%' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { title: 'Total Inventory Value', value: '₹4,82,340', sub: '↑ 12.6% vs last month', subColor: 'text-green-600', icon: Briefcase, iconBg: 'bg-green-100', iconColor: 'text-green-600' },
          { title: 'Total Products', value: '1,284', sub: '↑ 8.3% vs last month', subColor: 'text-green-600', icon: ShoppingBag, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
          { title: 'At Risk (Near Expiry)', value: '37 Items', sub: '₹18,420 value at risk', subColor: 'text-slate-500', icon: AlertTriangle, iconBg: 'bg-orange-100', iconColor: 'text-orange-500' },
          { title: 'Expired Items', value: '8 Items', sub: '₹2,160 loss', subColor: 'text-slate-500', icon: XCircle, iconBg: 'bg-red-100', iconColor: 'text-red-500' },
          { title: 'Waste Prevented', value: '₹7,240', sub: 'This month', subColor: 'text-slate-500', icon: Leaf, iconBg: 'bg-green-100', iconColor: 'text-emerald-600' },
        ].map((metric, i) => (
          <div key={i} className="glass-panel p-4 flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${metric.iconBg}`}>
                <metric.icon className={`w-5 h-5 ${metric.iconColor}`} />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">{metric.title}</div>
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 mb-1">{metric.value}</div>
              <div className={`text-xs font-medium ${metric.subColor}`}>{metric.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Middle Row: Charts & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Inventory Overview (Donut) */}
        <div className="glass-panel p-5 col-span-1">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-800">Inventory Overview</h3>
            <select className="text-xs border border-slate-200 rounded px-2 py-1 bg-slate-50 text-slate-600 focus:outline-none">
              <option>All Categories</option>
            </select>
          </div>
          <div className="flex items-center">
            <div className="w-1/2 h-[180px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventoryData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {inventoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-xl font-bold text-slate-900">1,284</div>
                <div className="text-[10px] text-slate-500">Total Products</div>
              </div>
            </div>
            <div className="w-1/2 pl-2">
              <ul className="space-y-2">
                {inventoryData.map((item, i) => (
                  <li key={i} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 font-medium">{item.name}</span>
                    </div>
                    <div className="font-semibold text-slate-900">
                      {item.value} <span className="text-slate-400 font-normal ml-1">({((item.value / 1284) * 100).toFixed(1)}%)</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Sales Trend (Line Chart) */}
        <div className="glass-panel p-5 col-span-1">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-800">Sales Trend</h3>
            <select className="text-xs border border-slate-200 rounded px-2 py-1 bg-slate-50 text-slate-600 focus:outline-none">
              <option>This Month</option>
            </select>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: '#0F172A', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#0FA958" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#0FA958', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#0FA958', stroke: '#fff' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Urgent Actions */}
        <div className="col-span-1 flex flex-col h-full">
          <div className="flex justify-between items-center mb-3 px-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Bell className="w-4 h-4" /> Urgent Actions</h3>
            <a href="#" className="text-xs font-semibold text-blue-600 hover:underline">View All</a>
          </div>
          <div className="flex-1 space-y-3">
            {[
              { title: '20 units of Amul Milk will expire in 2 days', desc: 'Value at risk: ₹1,000', icon: Bell, iconColor: 'text-red-500', bg: 'bg-red-50', btnBg: 'bg-red-500', btnText: 'Take Action' },
              { title: '6 batches eligible for return', desc: 'Return window closes today', icon: Bell, iconColor: 'text-orange-500', bg: 'bg-orange-50', btnBg: 'bg-orange-500', btnText: 'Take Action' },
              { title: 'Transfer opportunity to Store #2', desc: '18 units can be moved', icon: ArrowRightLeft, iconColor: 'text-blue-500', bg: 'bg-blue-50', btnBg: 'bg-blue-500', btnText: 'Take Action' },
              { title: 'Reorder suggested for 7 products', desc: 'Stockout expected in 3-5 days', icon: ShoppingCart, iconColor: 'text-green-600', bg: 'bg-green-50', btnBg: 'bg-green-600', btnText: 'Take Action' },
            ].map((action, i) => (
              <div key={i} className="glass-panel p-3 flex justify-between items-center border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${action.bg}`}>
                    <action.icon className={`w-4 h-4 ${action.iconColor}`} />
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${action.iconColor === 'text-blue-500' ? 'text-blue-600' : 'text-slate-800'}`}>{action.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{action.desc}</p>
                  </div>
                </div>
                <button className={`text-[10px] font-bold text-white px-3 py-1.5 rounded whitespace-nowrap ${action.btnBg} hover:opacity-90 transition-opacity`}>
                  {action.btnText}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: AI Actions, Timeline & AI Briefing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (AI Actions + Timeline) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* AI Priority Actions */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 px-1">✨ AI Priority Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { title: 'Sell First', count: '12 Products', impact: 'Potential loss', val: '₹4,200', btnText: 'View Products', color: 'red', icon: AlertTriangle },
                { title: 'Discount', count: '7 Products', impact: 'Potential recovery', val: '₹2,840', btnText: 'View Products', color: 'orange', icon: TrendingUp },
                { title: 'Transfer', count: '18 Units', impact: 'Value to transfer', val: '₹3,900', btnText: 'View Details', color: 'blue', icon: ArrowRightLeft },
                { title: 'Reorder', count: '7 Products', impact: 'Stockout in 3-5 days', val: '', btnText: 'View Suggestions', color: 'green', icon: ShoppingCart },
              ].map((action, i) => (
                <div key={i} className={`glass-panel p-4 flex flex-col justify-between border-t-4 border-t-${action.color}-500`}>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`text-${action.color}-500 bg-${action.color}-50 p-1.5 rounded`}>
                        <action.icon className="w-4 h-4" />
                      </div>
                      <h4 className={`text-sm font-bold text-${action.color}-600`}>{action.title}</h4>
                    </div>
                    <div className="text-sm font-semibold text-slate-800">{action.count}</div>
                    
                    <div className="mt-3 mb-4">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">{action.impact}</div>
                      {action.val && <div className="text-lg font-bold text-slate-900">{action.val}</div>}
                    </div>
                  </div>
                  <button className={`w-full py-1.5 rounded border border-${action.color}-200 text-${action.color}-600 bg-${action.color}-50 hover:bg-${action.color}-100 text-xs font-semibold transition-colors`}>
                    {action.btnText}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Expiry Timeline */}
          <div className="glass-panel p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Expiry Timeline</h3>
            <div className="space-y-4">
              {expiryTimelineData.map((row, i) => (
                <div key={i} className="flex items-center gap-4 text-xs font-medium">
                  <div className="w-20 text-right text-slate-600 whitespace-nowrap">{row.name}</div>
                  <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: row.width, backgroundColor: row.fill }} />
                  </div>
                  <div className="w-16 text-right text-slate-800">{row.items} items</div>
                  <div className="w-20 text-right text-slate-500">{row.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Insights + Briefing) */}
        <div className="col-span-1 space-y-6">
          
          {/* AI Insights */}
          <div>
            <div className="flex justify-between items-center mb-3 px-1">
              <h3 className="text-sm font-bold text-slate-800">AI Insights</h3>
              <a href="#" className="text-xs font-semibold text-blue-600 hover:underline">View All</a>
            </div>
            <div className="space-y-3">
              {[
                { title: 'Overstock Detected', desc: 'You have 5.8 months of inventory for Parle-G. Consider reducing next purchase.', icon: Package, bg: 'bg-purple-100', color: 'text-purple-600' },
                { title: 'Demand Spike', desc: 'Lays Chips sales increased 37% this week. Consider increasing stock.', icon: TrendingUp, bg: 'bg-green-100', color: 'text-green-600' },
                { title: 'Waste Prevention', desc: 'You prevented ₹1,240 of potential waste yesterday. Great job!', icon: Leaf, bg: 'bg-emerald-100', color: 'text-emerald-600' },
              ].map((insight, i) => (
                <div key={i} className="glass-panel p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${insight.bg}`}>
                      <insight.icon className={`w-4 h-4 ${insight.color}`} />
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold ${insight.color}`}>{insight.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{insight.desc}</p>
                      <button className="text-[10px] font-semibold text-blue-600 mt-2 px-2 py-1 bg-blue-50 rounded">View Details</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's AI Briefing */}
          <div className="bg-[#063120] rounded-xl p-5 border border-[#0A412A] text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#0FA958] rounded-full blur-3xl opacity-20 transform translate-x-1/2 -translate-y-1/2" />
            <div className="flex items-center gap-2 mb-3 relative z-10">
              <div className="w-8 h-8 bg-[#0FA958] rounded-full flex items-center justify-center">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-sm">Today's AI Briefing</h3>
            </div>
            <div className="space-y-1 mb-4 relative z-10">
              <p className="text-xs text-slate-300">You have 5 important actions today</p>
              <p className="text-[13px] font-semibold text-white">Est. impact: Save ₹3,200 & prevent waste</p>
            </div>
            <button className="w-full py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 relative z-10">
              View Briefing <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* 4. Bottom Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Suppliers', val: '24', sub: 'Active Suppliers', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Purchase Orders', val: '12', sub: 'Pending Orders', icon: ShoppingCart, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'GRN Pending', val: '5', sub: 'Needs Approval', icon: Package, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Avg. Gross Margin', val: '18.6%', sub: 'This Month', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Credit Outstanding', val: '₹1,24,500', sub: 'From 18 Customers', icon: Briefcase, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase">{stat.label}</div>
              <div className="text-lg font-bold text-slate-900">{stat.val}</div>
              <div className="text-[10px] text-slate-400">{stat.sub}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
