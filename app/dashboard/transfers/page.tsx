"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRightLeft, Building2, PackageSearch, CheckCircle2, ChevronRight, Truck, Loader2, AlertCircle } from "lucide-react";
import apiClient from "@/lib/api-client";
import { Store, InventoryBatch } from "@/lib/backend-types";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function TransfersPage() {
  const [step, setStep] = useState(1);
  const [sourceStore, setSourceStore] = useState("");
  const [destStore, setDestStore] = useState("");
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  
  const [stores, setStores] = useState<Store[]>([]);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [storesData, batchesData] = await Promise.all([
           // Real stores only — never fabricated branches. Inter-store transfers
           // require a second store owned by the account (see /api/stores).
           apiClient.get<any[]>("/api/stores"),
           apiClient.get<InventoryBatch[]>("/api/inventory/batches")
        ]);
        setStores(storesData as Store[]);
        setBatches(batchesData);
      } catch (err: any) {
        setError(err.message || "Failed to load transfer data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);
  
  const handleTransfer = async () => {
    try {
      // Create transfer requests for each selected batch
      for (const batchId of selectedBatches) {
         const batch = batches.find(b => b.id === batchId);
         if (!batch) continue;
         await apiClient.post<any>("/api/transfers/", {
             from_store_id: sourceStore,
             to_store_id: destStore,
             product_id: batch.product_id,
             quantity: batch.quantity || 1
         });
      }
      setStep(4); // Success step
    } catch (err: any) {
      alert("Transfer failed: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        <AlertCircle className="w-6 h-6 mr-2" /> {error}
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 max-w-5xl mx-auto pb-12">
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2 text-text-primary">
          <ArrowRightLeft className="w-8 h-8 text-brand-green" />
          Stock Transfers
        </h1>
        <p className="text-text-secondary">Move inventory between stores to balance stock levels and reduce expiry waste.</p>
      </motion.div>

      {/* Transfer Wizard */}
      <motion.div variants={itemVariants} className="glass-panel p-6">
        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-8 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
             <div 
               className="h-full bg-brand-green transition-all duration-500"
               style={{ width: `${((step - 1) / 3) * 100}%` }}
             />
          </div>
          {[1, 2, 3, 4].map((s) => (
            <div 
              key={s} 
              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors duration-300 ${
                step >= s ? "bg-brand-green text-black shadow-[0_0_10px_rgba(34,197,94,0.4)]" : "bg-bg-surface border border-border-default text-text-muted"
              }`}
            >
              {s === 4 && step === 4 ? <CheckCircle2 className="w-5 h-5" /> : s}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-semibold mb-4 text-text-primary">Select Stores</h2>
              {stores.length < 2 ? (
                <div className="p-8 rounded-lg border border-dashed border-border-default bg-bg-surface text-center">
                  <Building2 className="w-8 h-8 mx-auto text-text-muted mb-3" />
                  <p className="font-medium text-text-primary">Transfers need a second store</p>
                  <p className="text-sm text-text-secondary mt-1 max-w-sm mx-auto">
                    This workspace has one store. Inter-store transfers become available once a second branch is added to your account.
                  </p>
                </div>
              ) : (
                <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Source Store</label>
                  <div className="space-y-2">
                    {stores.map(s => (
                      <div 
                        key={`src-${s.id}`}
                        onClick={() => setSourceStore(s.id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${
                          sourceStore === s.id ? "border-brand-green bg-brand-green/10" : "border-border-default bg-bg-surface hover:border-brand-green/50 hover:bg-slate-50"
                        }`}
                      >
                        <Building2 className={`w-5 h-5 ${sourceStore === s.id ? "text-brand-green" : "text-text-muted"}`} />
                        <div>
                          <div className="font-medium text-text-primary">{s.name}</div>
                          <div className="text-xs text-text-secondary">{s.id === stores[0]?.id ? batches.length + " batches" : "Active Store"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Destination Store</label>
                  <div className="space-y-2">
                    {stores.map(s => (
                      <div 
                        key={`dst-${s.id}`}
                        onClick={() => setDestStore(s.id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${
                          destStore === s.id ? "border-brand-green bg-brand-green/10" : "border-border-default bg-bg-surface hover:border-brand-green/50 hover:bg-slate-50"
                        }`}
                      >
                        <Building2 className={`w-5 h-5 ${destStore === s.id ? "text-brand-green" : "text-text-muted"}`} />
                        <div>
                          <div className="font-medium text-text-primary">{s.name}</div>
                          <div className="text-xs text-text-secondary">Destination</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button 
                  onClick={() => setStep(2)} 
                  disabled={!sourceStore || !destStore || sourceStore === destStore}
                  className="bg-brand-green text-black px-6 py-2 rounded-lg font-medium hover:bg-brand-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Next Step <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              </>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-text-primary">Select Batches</h2>
                <div className="text-sm bg-brand-green/20 text-brand-green px-3 py-1 rounded-full font-medium">
                  {selectedBatches.length} selected
                </div>
              </div>
              <div className="border border-border-default rounded-lg overflow-hidden bg-bg-surface">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border-default">
                      <th className="p-4 w-12 text-center">
                         <input type="checkbox" className="accent-brand-green cursor-pointer" 
                           onChange={(e) => setSelectedBatches(e.target.checked ? batches.map(b => b.id) : [])}
                           checked={selectedBatches.length === batches.length && batches.length > 0}
                         />
                      </th>
                      <th className="p-4 text-xs font-medium text-text-secondary uppercase">Product Details</th>
                      <th className="p-4 text-xs font-medium text-text-secondary uppercase">Quantity</th>
                      <th className="p-4 text-xs font-medium text-text-secondary uppercase">Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {batches.map(batch => (
                      <tr 
                        key={batch.id} 
                        className={`cursor-pointer transition-colors hover:bg-slate-50 ${selectedBatches.includes(batch.id) ? "bg-brand-green/5" : ""}`}
                        onClick={() => setSelectedBatches(prev => prev.includes(batch.id) ? prev.filter(id => id !== batch.id) : [...prev, batch.id])}
                      >
                        <td className="p-4 text-center">
                          <input type="checkbox" className="accent-brand-green cursor-pointer" checked={selectedBatches.includes(batch.id)} readOnly />
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-text-primary">Product ID: {batch.product_id.split("-")[0]}</div>
                          <div className="text-xs text-text-muted">Batch: {batch.batch_number || "N/A"}</div>
                        </td>
                        <td className="p-4 font-medium text-text-primary">{batch.quantity} units</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            new Date(batch.expiry_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'bg-red-500/10 text-red-500' :
                            'bg-brand-green/10 text-brand-green'
                          }`}>
                            {batch.expiry_date}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {batches.length === 0 && (
                      <tr>
                         <td colSpan={4} className="p-8 text-center text-text-secondary">No batches found in source store.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between mt-6">
                <button onClick={() => setStep(1)} className="px-6 py-2 rounded-lg font-medium text-text-secondary hover:bg-slate-100 transition-colors">Back</button>
                <button 
                  onClick={() => setStep(3)} 
                  disabled={selectedBatches.length === 0}
                  className="bg-brand-green text-black px-6 py-2 rounded-lg font-medium hover:bg-brand-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Review Transfer <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-semibold mb-4 text-text-primary">Review & Confirm</h2>
              <div className="bg-bg-surface p-6 rounded-lg border border-border-default space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-text-secondary mb-1">From</div>
                    <div className="font-semibold text-lg text-text-primary">{stores.find(s => s.id === sourceStore)?.name}</div>
                  </div>
                  <div className="px-4">
                    <Truck className="w-6 h-6 text-brand-green mx-auto" />
                    <div className="text-xs text-text-muted mt-1">In-transit: ~45 mins</div>
                  </div>
                  <div className="flex-1 text-right">
                    <div className="text-sm text-text-secondary mb-1">To</div>
                    <div className="font-semibold text-lg text-text-primary">{stores.find(s => s.id === destStore)?.name}</div>
                  </div>
                </div>
                <hr className="border-border-default my-4" />
                <div>
                  <h3 className="font-medium text-text-primary mb-3">Items to Transfer</h3>
                  <ul className="space-y-2">
                    {batches.filter(b => selectedBatches.includes(b.id)).map(b => (
                      <li key={b.id} className="flex justify-between text-sm">
                        <span className="text-text-secondary">PID: {b.product_id.split("-")[0]} ({b.batch_number || "No Batch"})</span>
                        <span className="font-medium text-text-primary">{b.quantity} units</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <button onClick={() => setStep(2)} className="px-6 py-2 rounded-lg font-medium text-text-secondary hover:bg-slate-100 transition-colors">Back</button>
                <button 
                  onClick={handleTransfer}
                  className="bg-brand-green text-black px-6 py-2 rounded-lg font-medium hover:bg-brand-green/90 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                >
                  Confirm Transfer <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 bg-brand-green/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-brand-green" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-text-primary">Transfer Initiated!</h2>
              <p className="text-text-secondary max-w-md mx-auto mb-8">
                The store teams have been notified. A manifest has been generated for the logistics team.
              </p>
              <button 
                onClick={() => { setStep(1); setSourceStore(""); setDestStore(""); setSelectedBatches([]); }}
                className="bg-bg-surface border border-border-default text-text-primary px-6 py-2 font-medium hover:bg-slate-50 rounded-lg transition-colors"
              >
                Create Another Transfer
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
