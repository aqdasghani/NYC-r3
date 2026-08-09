"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  AlertCircle, 
  PackageMinus, 
  Zap, 
  CheckCircle2, 
  Clock,
  MoreVertical,
  Check,
  Settings
} from 'lucide-react';

const mockAlerts = [
  {
    id: 1,
    type: "critical",
    category: "Inventory",
    title: "Low Stock Alert: Bamboo Toothbrushes",
    message: "Inventory has dropped below the minimum threshold (15 units remaining). Automatic reordering failed.",
    time: "10 mins ago",
    unread: true,
    icon: PackageMinus,
    color: "text-red-600",
    bg: "bg-red-100",
    border: "border-red-200"
  },
  {
    id: 2,
    type: "warning",
    category: "System",
    title: "Payment Gateway Latency",
    message: "Stripe integration is experiencing higher than normal response times (avg 2.4s).",
    time: "45 mins ago",
    unread: true,
    icon: AlertCircle,
    color: "text-orange-600",
    bg: "bg-orange-100",
    border: "border-orange-200"
  },
  {
    id: 3,
    type: "info",
    category: "AI",
    title: "New AI Insights Available",
    message: "Green Quant has generated 3 new recommendations based on yesterday's sales data.",
    time: "2 hours ago",
    unread: true,
    icon: Zap,
    color: "text-blue-600",
    bg: "bg-blue-100",
    border: "border-blue-200"
  },
  {
    id: 4,
    type: "success",
    category: "Operations",
    title: "Supplier Shipment Received",
    message: "Shipment #SHP-9021 from EcoPack Inc has been received and verified.",
    time: "Yesterday, 3:45 PM",
    unread: false,
    icon: CheckCircle2,
    color: "text-green-600",
    bg: "bg-green-100",
    border: "border-green-200"
  },
  {
    id: 5,
    type: "warning",
    category: "Inventory",
    title: "Expiring Products",
    message: "Batch #442 of Organic Energy Bars will expire in 14 days. Consider a promotion.",
    time: "Yesterday, 10:15 AM",
    unread: false,
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-100",
    border: "border-amber-200"
  }
];

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [alerts, setAlerts] = useState(mockAlerts);

  const markAllAsRead = () => {
    setAlerts(alerts.map(a => ({ ...a, unread: false })));
  };

  const markAsRead = (id: number) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, unread: false } : a));
  };

  const removeAlert = (id: number) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const unreadCount = alerts.filter(a => a.unread).length;

  const filteredAlerts = alerts.filter(alert => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return alert.unread;
    return alert.category.toLowerCase() === activeTab;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">System Alerts</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                {unreadCount} New
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-1">Stay updated with notifications and system events.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" /> Mark all as read
          </button>
          <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors shadow-sm">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Sidebar Filters */}
        <div className="w-full md:w-64 shrink-0 space-y-1">
          <div className="font-semibold text-xs text-slate-400 uppercase tracking-wider mb-3 px-3">Filters</div>
          {[
            { id: 'all', label: 'All Alerts', icon: Bell },
            { id: 'unread', label: 'Unread', icon: AlertCircle, badge: unreadCount },
            { id: 'inventory', label: 'Inventory', icon: PackageMinus },
            { id: 'ai', label: 'AI Insights', icon: Zap },
            { id: 'system', label: 'System', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-[#0FA958] text-white' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`} />
                {tab.label}
              </div>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-200 text-slate-700'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Alerts Feed */}
        <div className="flex-1 w-full space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                  key={alert.id}
                  className={`bg-white rounded-xl p-4 sm:p-5 border transition-all ${
                    alert.unread ? `border-l-4 ${alert.border} shadow-sm` : 'border-slate-100 opacity-75'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-full ${alert.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <alert.icon className={`w-5 h-5 ${alert.color}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                              {alert.category}
                            </span>
                            {alert.unread && (
                              <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            )}
                          </div>
                          <h4 className={`text-base font-semibold ${alert.unread ? 'text-slate-900' : 'text-slate-700'}`}>
                            {alert.title}
                          </h4>
                        </div>
                        <span className="text-xs font-medium text-slate-400 shrink-0 whitespace-nowrap">
                          {alert.time}
                        </span>
                      </div>
                      
                      <p className={`text-sm mt-1.5 leading-relaxed ${alert.unread ? 'text-slate-600' : 'text-slate-500'}`}>
                        {alert.message}
                      </p>
                      
                      {alert.unread && (
                        <div className="mt-4 flex items-center gap-3">
                          <button 
                            onClick={() => markAsRead(alert.id)}
                            className="text-xs font-medium text-[#0FA958] hover:text-[#0c8f49] hover:underline"
                          >
                            Mark as read
                          </button>
                          <span className="text-slate-300">•</span>
                          <button 
                            onClick={() => removeAlert(alert.id)}
                            className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="shrink-0 relative group">
                      <button className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 py-1">
                        {!alert.unread && (
                          <button 
                            onClick={() => setAlerts(alerts.map(a => a.id === alert.id ? { ...a, unread: true } : a))}
                            className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                          >
                            Mark unread
                          </button>
                        )}
                        <button 
                          onClick={() => removeAlert(alert.id)}
                          className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-50/50 rounded-xl border border-slate-200 border-dashed p-12 text-center"
              >
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                  <Bell className="w-6 h-6 text-slate-300" />
                </div>
                <h3 className="text-slate-900 font-medium mb-1">No alerts found</h3>
                <p className="text-slate-500 text-sm">You're all caught up! No active alerts in this category.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
