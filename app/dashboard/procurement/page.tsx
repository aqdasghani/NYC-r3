"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Plus, FileText, Search, TrendingUp, Filter, Check, ShieldAlert, CheckCircle2 } from "lucide-react";
import { 
  getProcurementSummary, 
  getPurchaseOrders, 
  getProcurementSuggestions, 
  createPurchaseOrder,
  getSuppliers,
  getProducts
} from "@/lib/api";
import type { ProcurementSummary, ProcurementSuggestion, PurchaseOrderListOut } from "@/lib/backend-types";
import type { SupplierOut, ProductOut } from "@/lib/backend-types";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function ProcurementPage() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [summary, setSummary] = useState<ProcurementSummary | null>(null);
  const [orders, setOrders] = useState<PurchaseOrderListOut[]>([]);
  const [suggestions, setSuggestions] = useState<ProcurementSuggestion[]>([]);
  
  const [suppliers, setSuppliers] = useState<SupplierOut[]>([]);
  const [products, setProducts] = useState<ProductOut[]>([]);
  
  // Manual PO Form State
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [poItems, setPoItems] = useState<{product_id: string, name: string, quantity: number}[]>([]);

  useEffect(() => {
    loadData();
    loadFormDependencies();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [sum, ords, suggs] = await Promise.all([
        getProcurementSummary(),
        getPurchaseOrders(),
        getProcurementSuggestions()
      ]);
      setSummary(sum);
      setOrders(ords);
      setSuggestions(suggs);
    } catch (e) {
      console.error("Failed to load procurement data", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadFormDependencies() {
    try {
      const [sups, prods] = await Promise.all([
        getSuppliers(),
        getProducts()
      ]);
      setSuppliers(sups);
      setProducts(prods);
    } catch (e) {
      console.error("Failed to load dependencies", e);
    }
  }

  async function handleApproveSuggestion(sugg: ProcurementSuggestion) {
    if (!sugg.supplier_id) {
      alert("Cannot approve automatically: Unknown supplier. Please create manually.");
      return;
    }
    try {
      await createPurchaseOrder({
        supplier_id: sugg.supplier_id,
        items: [{ product_id: sugg.product_id, quantity: sugg.suggestedQty }]
      });
      // Refresh
      await loadData();
    } catch (e) {
      console.error("Failed to approve suggestion", e);
      alert("Failed to create PO");
    }
  }

  async function handleGeneratePO() {
    if (!selectedSupplier || poItems.length === 0) {
      alert("Please select a supplier and add at least one item.");
      return;
    }
    try {
      await createPurchaseOrder({
        supplier_id: selectedSupplier,
        expected_delivery: expectedDelivery || null,
        items: poItems.map(item => ({ product_id: item.product_id, quantity: item.quantity }))
      });
      setShowForm(false);
      setPoItems([]);
      setSelectedSupplier("");
      setExpectedDelivery("");
      await loadData();
    } catch (e) {
      console.error("Failed to generate PO", e);
      alert("Failed to generate PO");
    }
  }

  function handleAddItem() {
    if (!selectedProduct || orderQuantity <= 0) return;
    const prod = products.find(p => p.id === selectedProduct);
    if (!prod) return;
    
    setPoItems(prev => [...prev, { product_id: prod.id, name: prod.name, quantity: orderQuantity }]);
    setSelectedProduct("");
    setOrderQuantity(1);
  }

  function handleRemoveItem(idx: number) {
    setPoItems(prev => prev.filter((_, i) => i !== idx));
  }
  
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
              <select 
                value={selectedSupplier}
                onChange={e => setSelectedSupplier(e.target.value)}
                className="w-full bg-bg-surface border border-border-default text-text-primary rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/50 appearance-none cursor-pointer"
              >
                <option value="">Select a supplier...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Expected Delivery</label>
              <input 
                type="date" 
                value={expectedDelivery}
                onChange={e => setExpectedDelivery(e.target.value)}
                className="w-full bg-bg-surface border border-border-default text-text-primary rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/50 cursor-pointer" 
              />
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-secondary mb-2">Items</label>
            
            <div className="flex gap-2 mb-4">
              <select 
                value={selectedProduct}
                onChange={e => setSelectedProduct(e.target.value)}
                className="flex-1 bg-bg-surface border border-border-default text-text-primary rounded-lg px-4 py-2 focus:outline-none focus:border-brand-green"
              >
                <option value="">Select Product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input 
                type="number" 
                value={orderQuantity}
                onChange={e => setOrderQuantity(parseInt(e.target.value) || 0)}
                className="w-24 bg-bg-surface border border-border-default text-text-primary rounded-lg px-4 py-2 focus:outline-none focus:border-brand-green"
                placeholder="Qty"
                min="1"
              />
              <button 
                onClick={handleAddItem}
                className="bg-slate-100 text-text-primary px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Add
              </button>
            </div>

            {poItems.length > 0 ? (
              <div className="border border-border-default rounded-lg p-4 bg-slate-50 space-y-2">
                {poItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-2 border border-border-default rounded shadow-sm">
                    <span>{item.name} <span className="text-text-secondary">x{item.quantity}</span></span>
                    <button onClick={() => handleRemoveItem(idx)} className="text-red-500 text-sm hover:underline">Remove</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-border-default rounded-lg p-4 bg-slate-50 flex items-center justify-center border-dashed text-text-muted transition-colors h-24">
                <span className="flex items-center">No items added yet</span>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 mt-8">
            <button onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg font-medium text-text-secondary hover:bg-slate-100 transition-colors">Cancel</button>
            <button 
              onClick={handleGeneratePO}
              className="bg-brand-green text-black px-6 py-2 rounded-lg font-medium hover:bg-brand-green/90 transition-colors shadow-sm"
            >
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
                <div className="text-2xl font-bold text-text-primary">
                  {loading ? "..." : summary?.active_pos ?? 0}
                </div>
              </div>
              <div className="glass-panel p-4">
                <div className="text-sm font-medium text-text-secondary mb-1">Spend (MTD)</div>
                <div className="text-2xl font-bold text-text-primary">
                  {loading ? "..." : `₹${summary?.spend_mtd.toLocaleString() ?? 0}`}
                </div>
              </div>
              <div className="glass-panel p-4">
                <div className="text-sm font-medium text-text-secondary mb-1">Delayed Deliveries</div>
                <div className="text-2xl font-bold text-orange-500">
                  {loading ? "..." : summary?.delayed_deliveries ?? 0}
                </div>
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
                      <tr><td colSpan={5} className="p-4 text-center text-text-muted">Loading...</td></tr>
                    ) : orders.length === 0 ? (
                      <tr><td colSpan={5} className="p-4 text-center text-text-muted">No Purchase Orders found.</td></tr>
                    ) : (
                      orders.map(po => (
                        <tr key={po.id} className="hover:bg-bg-surface/50 transition-colors cursor-pointer">
                          <td className="p-4 font-medium text-brand-green">{po.id}</td>
                          <td className="p-4 text-text-primary">{po.supplier}</td>
                          <td className="p-4 text-text-secondary">{po.date}</td>
                          <td className="p-4 font-medium">{po.amount}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              po.status === 'Delivered' ? 'bg-green-100 text-green-700 border border-green-200' :
                              (po.status === 'In Transit' || po.status === 'Processing') ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                              'bg-orange-100 text-orange-700 border border-orange-200'
                            }`}>
                              {po.status}
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
                ) : suggestions.length === 0 ? (
                  <div className="text-center text-text-muted py-4 border border-border-default rounded-lg">No suggestions at this time.</div>
                ) : (
                  suggestions.map(item => (
                    <div key={item.id} className="border border-border-default rounded-lg p-3 bg-white hover:border-brand-green/30 transition-colors shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-text-primary">{item.product}</div>
                        <div className="text-xs font-semibold px-1.5 py-0.5 rounded text-green-700 bg-green-100 flex items-center">
                          {item.confidence}% Match
                        </div>
                      </div>
                      <div className="text-sm text-text-secondary mb-3">
                        Order <span className="font-medium text-text-primary">{item.suggestedQty} units</span> from {item.supplier}
                      </div>
                      
                      {item.status === 'Pending' ? (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleApproveSuggestion(item)}
                            className="flex-1 bg-brand-green text-black py-1.5 rounded text-sm font-medium hover:bg-brand-green/90 transition-colors flex items-center justify-center gap-1"
                          >
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
