"use client";
import RoleGate from '@/components/layout/RoleGate';


import React, { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Plus, FileText, Search, TrendingUp, Filter, Check, ShieldAlert, CheckCircle2 } from "lucide-react";

// Mock Data removed - using real API data

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

import { apiFetch } from "@/lib/api-client";

function ProcurementPageContent() {
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState<{ id: string, name: string, qty: number, price: number }[]>([]);
  
  const [recentPos, setRecentPos] = useState<any[]>([]);
  const [autoReorders, setAutoReorders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function loadData() {
      try {
        const pos = await apiFetch<any[]>("/api/procurement/orders");
        setRecentPos(pos || []);
      } catch (e) {
        setRecentPos([]);
      }
      try {
        const reorders = await apiFetch<any[]>("/api/procurement/suggestions");
        setAutoReorders(reorders || []);
      } catch (e) {
        setAutoReorders([]);
      }
      setLoading(false);
    }
    loadData();
  }, []);
  
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 max-w-6xl mx-auto">
      <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
            <ShoppingCart className="w-8 h-8 text-brand-green" />
            Procurement
          </h1>
          <p className="text-text-secondary">Manage purchase orders and AI-driven reorder recommendations.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-brand-green text-black px-4 py-2 rounded-lg font-medium hover:bg-brand-green/90 transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)]"
        >
          {showForm ? "Back to Dashboard" : <><Plus className="w-4 h-4" /> New PO</>}
        </button>
      </motion.div>

      {showForm ? (
        <motion.div variants={itemVariants} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 border-b border-border-default pb-4">
            <FileText className="w-5 h-5 text-brand-green" /> Create Purchase Order
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Supplier</label>
              <select className="w-full bg-bg-surface border border-border-default text-text-primary rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/50 appearance-none cursor-pointer">
                <option value="">Select a supplier...</option>
                <option value="s1">Fresh Farms Inc.</option>
                <option value="s2">Global Distributors</option>
                <option value="s3">Dairy Alternatives Co.</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Expected Delivery</label>
              <input type="date" className="w-full bg-bg-surface border border-border-default text-text-primary rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/50 cursor-pointer" />
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-secondary mb-2">Items</label>
            {items.length > 0 && (
              <div className="space-y-3 mb-4">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white border border-border-default p-3 rounded-lg shadow-sm">
                    <div>
                      <p className="font-medium text-text-primary">{item.name}</p>
                      <p className="text-xs text-text-secondary">₹{item.price} per unit</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-secondary">Qty:</span>
                        <input type="number" min="1" value={item.qty} onChange={(e) => {
                          const newItems = [...items];
                          newItems[idx].qty = parseInt(e.target.value) || 0;
                          setItems(newItems);
                        }} className="w-20 bg-bg-surface border border-border-default rounded px-2 py-1 focus:outline-none focus:border-brand-green" />
                      </div>
                      <div className="font-medium text-text-primary w-20 text-right">
                        ₹{(item.qty * item.price).toLocaleString()}
                      </div>
                      <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-500 text-sm hover:underline font-medium">Remove</button>
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-between items-center p-3 bg-slate-50 border border-border-default rounded-lg">
                  <span className="font-medium text-text-primary">Total Value:</span>
                  <span className="font-bold text-lg text-brand-green">₹{items.reduce((sum, item) => sum + (item.qty * item.price), 0).toLocaleString()}</span>
                </div>
              </div>
            )}
            
            <div 
              onClick={() => {
                const productOptions = [
                  { name: "Organic Apples", price: 120 },
                  { name: "Almond Milk 1L", price: 250 },
                  { name: "Whole Wheat Bread", price: 60 }
                ];
                const randomProduct = productOptions[items.length % productOptions.length];
                setItems([...items, { id: Date.now().toString(), name: randomProduct.name, qty: 10, price: randomProduct.price }]);
              }} 
              className={`border border-border-default rounded-lg p-4 bg-slate-50 flex items-center justify-center border-dashed text-text-muted hover:bg-slate-100 hover:text-brand-green hover:border-brand-green/50 cursor-pointer transition-colors ${items.length === 0 ? 'h-32' : 'h-16'}`}
            >
              <span className="flex items-center"><Plus className="w-4 h-4 mr-2" /> Add products to order</span>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-8">
            <button onClick={() => { setShowForm(false); setItems([]); }} className="px-6 py-2 rounded-lg font-medium text-text-secondary hover:bg-slate-100 transition-colors">Cancel</button>
            <button className="bg-brand-green text-black px-6 py-2 rounded-lg font-medium hover:bg-brand-green/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled={items.length === 0}>
              Generate PO
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Area: Recent POs */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-panel p-4">
                <div className="text-sm font-medium text-text-secondary mb-1">Active POs</div>
                <div className="text-2xl font-bold text-text-primary">{loading ? "-" : recentPos.length}</div>
                <div className="text-xs text-brand-green mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Live Data</div>
              </div>
              <div className="glass-panel p-4">
                <div className="text-sm font-medium text-text-secondary mb-1">Spend (MTD)</div>
                <div className="text-2xl font-bold text-text-primary">
                  {loading ? "-" : `₹${recentPos.reduce((sum, po) => {
                    const amt = typeof po.amount === 'string' ? parseFloat(po.amount.replace(/[^0-9.-]+/g, "")) : (po.amount || 0);
                    return sum + amt;
                  }, 0).toLocaleString("en-IN")}`}
                </div>
                <div className="text-xs text-brand-green mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Live Data</div>
              </div>
              <div className="glass-panel p-4">
                <div className="text-sm font-medium text-text-secondary mb-1">Delayed Deliveries</div>
                <div className="text-2xl font-bold text-orange-500">{loading ? "-" : recentPos.filter(p => p.status === 'Delayed').length}</div>
                <div className="text-xs text-text-muted mt-2">Requires attention</div>
              </div>
            </div>

            {/* PO List */}
            <div className="glass-panel overflow-hidden">
              <div className="p-4 border-b border-border-default flex items-center justify-between bg-slate-50">
                <h3 className="font-semibold text-text-primary">Recent Purchase Orders</h3>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input type="text" placeholder="Search POs..." className="bg-white border border-border-default rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-brand-green" />
                  </div>
                  <button className="p-1.5 border border-border-default rounded-md bg-white hover:bg-slate-50 transition-colors text-text-secondary" title="Filter">
                    <Filter className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-border-default">
                      <th className="p-4 text-xs font-medium text-text-secondary uppercase">PO Number</th>
                      <th className="p-4 text-xs font-medium text-text-secondary uppercase">Supplier</th>
                      <th className="p-4 text-xs font-medium text-text-secondary uppercase">Date</th>
                      <th className="p-4 text-xs font-medium text-text-secondary uppercase">Amount</th>
                      <th className="p-4 text-xs font-medium text-text-secondary uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-text-muted">Loading orders...</td>
                      </tr>
                    ) : recentPos.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-text-muted">No purchase orders found.</td>
                      </tr>
                    ) : (
                      recentPos.map(po => (
                        <tr key={po.id} className="hover:bg-bg-surface/50 transition-colors cursor-pointer">
                          <td className="p-4 font-medium text-brand-green">{po.id}</td>
                          <td className="p-4 text-text-primary">{po.supplier}</td>
                          <td className="p-4 text-text-secondary">{po.date || new Date().toISOString().slice(0, 10)}</td>
                          <td className="p-4 font-medium">{typeof po.amount === 'string' ? po.amount : `₹${(po.amount || 0).toLocaleString("en-IN")}`}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              po.status === 'Delivered' ? 'bg-green-100 text-green-700 border border-green-200' :
                              po.status === 'In Transit' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                              'bg-orange-100 text-orange-700 border border-orange-200'
                            }`}>
                              {po.status || 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>

          {/* Sidebar: AI Reorders */}
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="glass-panel p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-green/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
              
              <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2 relative z-10">
                <ShieldAlert className="w-5 h-5 text-brand-green" />
                AI Reorder Suggestions
              </h3>
              
              <div className="space-y-4 relative z-10">
                {loading ? (
                  <div className="text-center text-text-muted py-4">Loading suggestions...</div>
                ) : autoReorders.length === 0 ? (
                  <div className="text-center text-text-muted py-4">No pending reorders.</div>
                ) : (
                  autoReorders.map(item => (
                    <div key={item.id} className="border border-border-default rounded-lg p-3 bg-white hover:border-brand-green/30 transition-colors shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-text-primary">{item.product}</div>
                        <div className="text-xs font-semibold px-1.5 py-0.5 rounded text-green-700 bg-green-100 flex items-center">
                          {item.confidence || 90}% Match
                        </div>
                      </div>
                      <div className="text-sm text-text-secondary mb-3">
                        Order <span className="font-medium text-text-primary">{item.suggestedQty} units</span> from {item.supplier}
                      </div>
                      
                      {item.status === 'Pending' || !item.status ? (
                        <div className="flex gap-2">
                          <button className="flex-1 bg-brand-green text-black py-1.5 rounded text-sm font-medium hover:bg-brand-green/90 transition-colors flex items-center justify-center gap-1">
                            <Check className="w-3 h-3" /> Approve
                          </button>
                          <button className="flex-1 border border-border-default bg-slate-50 py-1.5 rounded text-sm font-medium hover:bg-slate-100 transition-colors text-text-secondary">
                            Dismiss
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm text-green-600 flex items-center gap-1 font-medium bg-green-50 p-2 rounded border border-green-100">
                          <CheckCircle2 className="w-4 h-4" /> Added to PO
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              <button className="w-full mt-4 py-2 text-sm font-medium text-brand-green hover:underline flex justify-center items-center">
                View all suggestions
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}


export default function ProcurementPage() {
  return (
    <RoleGate module="procurement">
      <ProcurementPageContent />
    </RoleGate>
  );
}
