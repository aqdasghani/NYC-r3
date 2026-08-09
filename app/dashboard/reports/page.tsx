"use client";

import React, { useState } from "react";
import { Download, Calendar, BarChart2, TrendingUp, PieChart as PieChartIcon, Activity } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { formatINR } from "@/lib/utils";

// Mock Data
const revenueData = [
  { name: "Jan", revenue: 4000, profit: 2400 },
  { name: "Feb", revenue: 3000, profit: 1398 },
  { name: "Mar", revenue: 2000, profit: 9800 },
  { name: "Apr", revenue: 2780, profit: 3908 },
  { name: "May", revenue: 1890, profit: 4800 },
  { name: "Jun", revenue: 2390, profit: 3800 },
  { name: "Jul", revenue: 3490, profit: 4300 },
];

const wasteData = [
  { name: "Week 1", waste: 400, prevented: 240 },
  { name: "Week 2", waste: 300, prevented: 139 },
  { name: "Week 3", waste: 200, prevented: 980 },
  { name: "Week 4", waste: 278, prevented: 390 },
];

const categoryData = [
  { name: "Dairy", value: 400 },
  { name: "Produce", value: 300 },
  { name: "Bakery", value: 300 },
  { name: "Meat", value: 200 },
];

const COLORS = ["#0FA958", "#F59E0B", "#EF4444", "#3B82F6"];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("This Month");

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Analytics & Reports</h2>
          <p className="text-sm text-slate-500">Track your store's performance and generate exports.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* DateRangePicker Mock */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-lg pl-10 pr-8 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
              <option>Last 3 Months</option>
              <option>Year to Date</option>
            </select>
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          
          {/* ExportButton Mock */}
          <button className="flex items-center gap-2 bg-[#0FA958] hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: "Total Revenue", value: formatINR(124500), trend: "+12.5%", color: "text-green-600", icon: TrendingUp },
          { title: "Waste Cost", value: formatINR(4200), trend: "-5.2%", color: "text-red-500", icon: BarChart2 },
          { title: "Avg. Margin", value: "32.4%", trend: "+1.2%", color: "text-blue-600", icon: Activity },
          { title: "Items Sold", value: "8,432", trend: "+8.4%", color: "text-orange-500", icon: PieChartIcon },
        ].map((kpi, i) => (
          <div key={i} className="glass-panel p-5">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-sm font-semibold text-slate-500">{kpi.title}</h3>
              <div className={`p-1.5 rounded-lg bg-slate-50`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{kpi.value}</div>
            <div className="text-xs font-medium text-green-600 mt-1">{kpi.trend} from previous period</div>
          </div>
        ))}
      </div>

      {/* ChartGrid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Revenue Overview */}
        <div className="glass-panel p-5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-800">Revenue & Profit Overview</h3>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0FA958" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0FA958" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="revenue" stroke="#0FA958" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                <Line type="monotone" dataKey="profit" stroke="#3B82F6" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Waste Reduction Tracking */}
        <div className="glass-panel p-5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-800">Waste vs Prevented</h3>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wasteData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `₹${val}`} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} cursor={{fill: '#F8FAFC'}} />
                <Bar dataKey="waste" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="prevented" fill="#0FA958" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Category */}
        <div className="glass-panel p-5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-800">Sales by Category</h3>
          </div>
          <div className="h-[250px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Recent Exports Table */}
        <div className="glass-panel p-5 overflow-hidden flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Recent Reports</h3>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400">
                  <th className="pb-3 font-medium">Report Name</th>
                  <th className="pb-3 font-medium">Date Generated</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                {[1, 2, 3, 4].map((i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="py-3 font-medium text-slate-800">Monthly_Summary_July.csv</td>
                    <td className="py-3">Aug {i}, 2026</td>
                    <td className="py-3 text-right">
                      <button className="text-blue-600 font-medium hover:underline">Download</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
