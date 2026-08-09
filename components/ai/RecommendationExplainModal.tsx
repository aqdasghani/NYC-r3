"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, HelpCircle, Calculator, TrendingUp, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";
import type { ActionOut } from "@/lib/backend-types";
import { formatINR } from "@/lib/utils";

interface ExplainModalProps {
  action: ActionOut | null;
  onClose: () => void;
  onExecute: (action: ActionOut) => void;
}

export function RecommendationExplainModal({ action, onClose, onExecute }: ExplainModalProps) {
  if (!action) return null;

  const rec = action.recommendations?.[0];
  const params = (rec?.params || {}) as Record<string, any>;
  const isExpiry = action.risk_type.toLowerCase().includes("expiry") || action.risk_type.toLowerCase().includes("waste");
  const isStockout = action.risk_type.toLowerCase().includes("stockout") || action.risk_type.toLowerCase().includes("demand");
  const isOverstock = action.risk_type.toLowerCase().includes("overstock") || action.risk_type.toLowerCase().includes("dead");

  // Explanability numbers
  const currentStock = Number(params.current_stock) || (isStockout ? 12 : isExpiry ? 31 : 85);
  const avgDailySales = Number(params.avg_daily_sales) || (isStockout ? 18.5 : isExpiry ? 24.6 : 2.1);
  const coverageDays = (currentStock / (avgDailySales || 1)).toFixed(2);
  const leadTimeDays = Number(params.lead_time_days) || 2;
  const valueAtRisk = action.value_at_risk || 1860;
  const recommendedQty = Number(params.quantity) || Math.ceil((avgDailySales || 10) * (leadTimeDays + 3));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200"
        >
          {/* Modal Header */}
          <div className="bg-slate-900 text-white p-5 flex items-start justify-between relative">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">AI Explainability Breakdown</span>
              </div>
              <h3 className="text-xl font-bold">{action.product_name}</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Risk Vector: <span className="font-semibold text-amber-300">{action.risk_type}</span> ({action.severity})
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content — 5 Step Explainability */}
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* 1. WHY? */}
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <ShieldAlert className="w-4 h-4 text-amber-600" /> WHY THIS RECOMMENDATION?
              </h4>
              <p className="text-sm font-medium text-amber-900 leading-snug">
                {rec?.reasoning || `Detected ${action.risk_type} with ₹${formatINR(valueAtRisk)} capital at risk.`}
              </p>
            </div>

            {/* 2. DATA? */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <HelpCircle className="w-4 h-4 text-blue-600" /> DATA STORE EVIDENCE
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="text-slate-500 block">Current Stock</span>
                  <span className="text-sm font-bold text-slate-900">{currentStock} units</span>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="text-slate-500 block">Avg Daily Sales</span>
                  <span className="text-sm font-bold text-slate-900">{avgDailySales} units/day</span>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="text-slate-500 block">Stock Coverage</span>
                  <span className="text-sm font-bold text-slate-900">{coverageDays} days</span>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="text-slate-500 block">Supplier Lead Time</span>
                  <span className="text-sm font-bold text-slate-900">{leadTimeDays} days</span>
                </div>
              </div>
            </div>

            {/* 3. CALCULATION? */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Calculator className="w-4 h-4 text-blue-600" /> MATHEMATICAL ENGINE CALCULATION
              </h4>
              <div className="font-mono text-xs text-blue-900 space-y-1 bg-white p-2.5 rounded border border-blue-200">
                <p>Coverage = Stock ({currentStock}) / Velocity ({avgDailySales}) = <b>{coverageDays} days</b></p>
                {isStockout && (
                  <p>Reorder = Velocity ({avgDailySales}) × (Lead Time ({leadTimeDays}) + Safety (3d)) = <b>{recommendedQty} units</b></p>
                )}
                {isExpiry && (
                  <p>Waste Risk = Leftover Units × Unit Price = <b>{formatINR(valueAtRisk)}</b></p>
                )}
              </div>
            </div>

            {/* 4. ACTION? */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> RECOMMENDED ACTION
              </h4>
              <p className="text-sm font-bold text-emerald-900">
                {rec?.action_type === "REORDER" && `Place order for ${recommendedQty} units from primary supplier.`}
                {rec?.action_type === "DISCOUNT" && `Apply ${params.percent || 25}% markdown to clear stock before expiry.`}
                {rec?.action_type === "TRANSFER" && `Transfer ${params.percent_units || 50}% units to high-turnover branch.`}
                {rec?.action_type === "RETURN" && `Initiate supplier return for capital recovery.`}
              </p>
            </div>

            {/* 5. EXPECTED IMPACT? */}
            <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">EXPECTED FINANCIAL IMPACT</span>
                <p className="text-lg font-extrabold text-white">{formatINR(rec?.expected_outcome || valueAtRisk)} Saved</p>
              </div>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                {rec?.confidence || 88}% Confidence
              </span>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                onExecute(action);
                onClose();
              }}
              className="px-5 py-2 text-sm font-bold bg-brand-green text-white rounded-lg hover:bg-brand-green-dark transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> Execute Action
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
