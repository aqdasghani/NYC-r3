"use client";

import React, { useState, useEffect } from 'react';
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
  Settings,
  XCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { getActions, dismissAction } from '@/lib/api';
import type { ActionOut } from '@/lib/backend-types';

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [alerts, setAlerts] = useState<ActionOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAlerts() {
      setLoading(true);
      try {
        const data = await getActions('PENDING');
        setAlerts(data);
      } catch (err) {
        console.error("Failed to load alerts", err);
      } finally {
        setLoading(false);
      }
    }
    loadAlerts();
  }, []);

  const markAllAsRead = async () => {
    setAlerts([]); // Optimistic
    for (const a of alerts) {
      try { await dismissAction(a.id); } catch (e) {}
    }
  };

  const markAsRead = async (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id));
    try {
      await dismissAction(id);
    } catch (e) {
      console.error(e);
    }
  };

  const removeAlert = (id: string) => markAsRead(id);

  const unreadCount = alerts.length;

  const filteredAlerts = alerts.filter(alert => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return true;
    return true; // We don't have enough categories to filter properly from ActionOut right now
  });

  const getAlertConfig = (severity: string) => {
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      return { icon: XCircle, color: "text-red-600", bg: "bg-red-100", border: "border-red-200", badge: "HIGH" };
    }
    if (severity === 'WARNING' || severity === 'MEDIUM') {
      return { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100", border: "border-amber-200", badge: "MEDIUM" };
    }
    return { icon: Info, color: "text-blue-600", bg: "bg-blue-100", border: "border-blue-200", badge: "LOW" };
  };



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
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert) => {
                  const config = getAlertConfig(alert.severity);
                  const Icon = config.icon;
                  const relativeTime = new Date(alert.created_at).toLocaleString(); // basic formatting
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.98, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                      key={alert.id}
                      className={`bg-white rounded-xl p-4 sm:p-5 border transition-all border-l-4 ${config.border} shadow-sm`}
                    >
                      <div className="flex gap-4">
                        <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <Icon className={`w-5 h-5 ${config.color}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-semibold uppercase tracking-wider ${config.color} px-2 py-0.5 rounded-full ${config.bg}`}>
                                  {config.badge}
                                </span>
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                              </div>
                              <h4 className={`text-base font-semibold text-slate-900`}>
                                {alert.risk_type.replace(/_/g, ' ')}
                              </h4>
                            </div>
                            <span className="text-xs font-medium text-slate-400 shrink-0 whitespace-nowrap">
                              {relativeTime}
                            </span>
                          </div>
                          
                          <p className={`text-sm mt-1.5 leading-relaxed text-slate-600`}>
                            At Risk: ₹{(alert.value_at_risk || 0).toLocaleString()} • {alert.product_name}
                          </p>
                          
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
                        </div>
                      </div>
                    </motion.div>
                  );
                })
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
                <p className="text-slate-500 text-sm">No active alerts. Your store is healthy! 💪</p>
              </motion.div>
            )}
          </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
