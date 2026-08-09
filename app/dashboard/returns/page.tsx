"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CornerDownLeft, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  ChevronDown,
  ArrowRight
} from 'lucide-react';

const returnMetrics = [
  { title: "Total Returns (30d)", value: "124", change: "+12%", trend: "up", icon: CornerDownLeft, color: "text-blue-500", bg: "bg-blue-50" },
  { title: "Return Rate", value: "3.2%", change: "-0.5%", trend: "down", icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
  { title: "Refunds Processed", value: "$4,250", change: "+5%", trend: "up", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50" },
  { title: "Pending Inspections", value: "18", change: "-2", trend: "down", icon: Clock, color: "text-orange-500", bg: "bg-orange-50" }
];

const returnRequests = [
  { id: "RET-8829", orderId: "ORD-3392", customer: "Sarah Jenkins", item: "Organic Cotton T-Shirt", date: "Today, 10:23 AM", status: "Pending", amount: "$35.00" },
  { id: "RET-8828", orderId: "ORD-3381", customer: "Michael Chen", item: "Reusable Water Bottle", date: "Today, 09:15 AM", status: "Approved", amount: "$24.50" },
  { id: "RET-8827", orderId: "ORD-3350", customer: "Emma Thompson", item: "Bamboo Utensil Set", date: "Yesterday", status: "Rejected", amount: "$18.00" },
  { id: "RET-8826", orderId: "ORD-3312", customer: "David Wilson", item: "Recycled Backpack", date: "Aug 07, 2026", status: "Refunded", amount: "$85.00" },
  { id: "RET-8825", orderId: "ORD-3298", customer: "Jessica Lee", item: "Solar Power Bank", date: "Aug 06, 2026", status: "Pending", amount: "$45.00" },
];

export default function ReturnsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "Pending":
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>;
      case "Approved":
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</span>;
      case "Refunded":
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Refunded</span>;
      case "Rejected":
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Returns Management</h1>
          <p className="text-slate-500 text-sm mt-1">Process and track customer returns and refunds.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            Export Data <ChevronDown className="w-4 h-4" />
          </button>
          <button className="px-4 py-2 bg-[#0FA958] text-white rounded-lg text-sm font-medium hover:bg-[#0c8f49] transition-colors shadow-sm shadow-green-500/20">
            Create Return
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {returnMetrics.map((metric, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={idx} 
            className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">{metric.title}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{metric.value}</h3>
              </div>
              <div className={`w-10 h-10 rounded-lg ${metric.bg} flex items-center justify-center`}>
                <metric.icon className={`w-5 h-5 ${metric.color}`} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${metric.trend === 'up' ? (metric.title === 'Return Rate' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600') : (metric.title === 'Return Rate' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600')}`}>
                {metric.change}
              </span>
              <span className="text-xs text-slate-400">vs last month</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Returns List section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden"
      >
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-800">Recent Return Requests</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Search returns..."
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0FA958]/20 focus:border-[#0FA958] w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Return ID</th>
                <th className="px-6 py-4 font-medium">Customer & Order</th>
                <th className="px-6 py-4 font-medium">Item</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {returnRequests.map((req, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-slate-900">{req.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">{req.customer}</div>
                    <div className="text-xs text-slate-500">{req.orderId}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{req.item}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{req.amount}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{req.date}</td>
                  <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-[#0FA958] hover:text-[#0c8f49] p-2 rounded-lg hover:bg-green-50 transition-colors inline-flex items-center gap-1 text-sm font-medium">
                      Review <ArrowRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
          <div>Showing 1 to 5 of 124 returns</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50">Prev</button>
            <button className="px-3 py-1 border border-slate-200 rounded bg-[#0FA958] text-white">1</button>
            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50">2</button>
            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50">3</button>
            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50">Next</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
