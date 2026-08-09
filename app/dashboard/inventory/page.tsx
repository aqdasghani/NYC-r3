"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { PackageSearch, AlertTriangle, ArrowDownRight, Clock, Plus, Search } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const inventoryData = [
  { id: 1, name: 'Amul Butter 500g', stock: 12, sales: '3.2/day', expiry: '2 days', status: 'critical', risk: '₹5,850' },
  { id: 2, name: 'Britannia Cheese', stock: 24, sales: '1.5/day', expiry: '8 days', status: 'warning', risk: '₹3,200' },
  { id: 3, name: 'Tropicana Orange', stock: 45, sales: '8/day', expiry: '12 days', status: 'warning', risk: '₹1,150' },
  { id: 4, name: 'Mother Dairy Milk', stock: 80, sales: '40/day', expiry: '3 days', status: 'safe', risk: '₹0' },
  { id: 5, name: 'Aashirvaad Atta 5kg', stock: 15, sales: '0.5/day', expiry: '180 days', status: 'dead', risk: '₹4,500' },
];

export default function InventoryPage() {
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Inventory & Expiry</h1>
          <p className="text-text-secondary">Monitor stock levels, expiry dates, and value at risk.</p>
        </div>
        <button className="flex items-center gap-2 bg-brand-green text-black px-4 py-2 rounded-lg font-medium hover:bg-brand-green/90 transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)]">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Items', value: '4,208' },
          { label: 'Value at Risk', value: '₹18,400', color: 'text-red-500' },
          { label: 'Critical Expiry', value: '14' },
          { label: 'Dead Stock', value: '38' },
        ].map((stat, i) => (
          <motion.div key={i} variants={itemVariants} className="glass-panel p-4 flex flex-col justify-between">
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">{stat.label}</span>
            <div className={`text-2xl font-bold ${stat.color || 'text-text-primary'}`}>{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <motion.div variants={itemVariants} className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input 
            type="text" 
            placeholder="Search products by name, barcode, or SKU..."
            className="w-full bg-bg-surface border border-border-default text-text-primary rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/50 transition-all placeholder:text-text-muted"
          />
        </div>
        <button className="glass-panel px-4 py-2 hover:bg-bg-surface/80 transition-colors">
          Filter
        </button>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants} className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-default bg-[#0A0A0A]">
                <th className="p-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Product</th>
                <th className="p-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Stock / Velocity</th>
                <th className="p-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Expiry</th>
                <th className="p-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Risk Value</th>
                <th className="p-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222]">
              {inventoryData.map((item) => (
                <tr key={item.id} className="hover:bg-bg-surface/50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-text-primary">{item.name}</div>
                    <div className="text-xs text-text-muted">SKU: {item.id.toString().padStart(6, '0')}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-text-primary">{item.stock} units</div>
                    <div className="text-xs text-text-muted">{item.sales}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-text-secondary" />
                      <span className={item.status === 'critical' ? 'text-red-400' : item.status === 'warning' ? 'text-orange-400' : 'text-text-secondary'}>
                        {item.expiry}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 font-medium text-text-primary">{item.risk}</td>
                  <td className="p-4">
                    {item.status === 'critical' && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">Critical (0-3d)</span>}
                    {item.status === 'warning' && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500 border border-orange-500/20">Warning (4-15d)</span>}
                    {item.status === 'dead' && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-200/50 text-text-secondary border border-slate-300/50">Dead Stock</span>}
                    {item.status === 'safe' && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-brand-green/10 text-brand-green border border-brand-green/20">Safe (30d+)</span>}
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-sm font-medium text-brand-green hover:text-brand-green/80 transition-colors">
                      Action
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
