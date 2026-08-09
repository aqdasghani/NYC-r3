"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Tag, RefreshCw, ShoppingCart, CornerDownLeft, CheckCircle2, XCircle, ScanSearch } from "lucide-react";
import { dismissAction, executeAction, generateActions, getActions } from "@/lib/api";
import { subscribeLive } from "@/lib/live";
import type { ActionOut, BackendRecommendation } from "@/lib/backend-types";
import { formatINR } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function planMeta(action: BackendRecommendation) {
  switch (action.action_type) {
    case "TRANSFER":
      return { icon: RefreshCw, color: "text-brand-blue", bg: "bg-brand-blue/10", border: "border-brand-blue/20" };
    case "REORDER":
      return { icon: ShoppingCart, color: "text-brand-green", bg: "bg-brand-green/10", border: "border-brand-green/20" };
    case "RETURN":
      return { icon: CornerDownLeft, color: "text-brand-orange", bg: "bg-brand-orange/10", border: "border-brand-orange/20" };
    case "DISCOUNT":
    default:
      return { icon: Tag, color: "text-brand-orange", bg: "bg-brand-orange/10", border: "border-brand-orange/20" };
  }
}

function cardMeta(riskType: string) {
  const t = riskType.toLowerCase();
  if (t.includes("overstock") || t.includes("dead")) return "Transfer / Return";
  if (t.includes("stockout") || t.includes("demand")) return "Procurement";
  if (t.includes("expiry")) return "Sell First";
  return "Action Needed";
}

export default function ActionsPage() {
  const [actions, setActions] = useState<ActionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const rows = await getActions("PENDING");
    setActions(rows);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const unsub = subscribeLive((event) => {
      if (event.type === "recommendation_updated" || event.type === "recommendation_created") {
        void load();
      }
    });
    return unsub;
  }, []);

  const handleExecute = async (action: ActionOut) => {
    const selected = action.recommendations?.[0];
    if (!selected || working) return;
    setWorking(action.id);
    try {
      const result = await executeAction(action.id, selected);
      setDone((prev) => new Set(prev).add(action.id));
      setActions((prev) => prev.filter((a) => a.id !== action.id));
      setScanResult(
        `${result.intervention} executed — ${formatINR(result.waste_prevented)} waste prevented, Green Score +${result.green_score_delta}`
      );
    } catch {
      setScanResult("Could not execute this action. It may no longer be pending.");
    } finally {
      setWorking(null);
    }
  };

  const handleDismiss = async (action: ActionOut) => {
    if (working) return;
    setWorking(action.id);
    try {
      await dismissAction(action.id);
      setActions((prev) => prev.filter((a) => a.id !== action.id));
    } finally {
      setWorking(null);
    }
  };

  const handleScan = async () => {
    setBusy(true);
    setScanResult(null);
    try {
      const result = await generateActions();
      setScanResult(`Detection run complete — ${result.risks_detected} risks, ${result.recommendations_created} new actions.`);
      await load();
    } catch {
      setScanResult("Detection run failed — is the backend running?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">AI Action Engine</h1>
          <p className="text-text-secondary">
            Review and execute AI-generated strategies to prevent waste and maximize profit.
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={busy}
          className="flex items-center gap-2 bg-brand-green text-black px-4 py-2.5 rounded-lg font-medium hover:bg-brand-green/90 transition-colors disabled:opacity-50"
        >
          <ScanSearch className={`w-4 h-4 ${busy ? "animate-pulse" : ""}`} />
          {busy ? "Scanning…" : "Run AI Scan"}
        </button>
      </motion.div>

      {scanResult && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel border border-brand-green/20 bg-brand-green/5 px-4 py-3 text-sm text-text-primary flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0" />
          {scanResult}
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {loading && (
          <div className="glass-panel p-8 text-center text-text-secondary">Loading AI actions…</div>
        )}

        <AnimatePresence>
          {!loading && actions.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel p-12 text-center flex flex-col items-center justify-center"
            >
              <div className="w-16 h-16 bg-brand-green/10 text-brand-green rounded-full flex items-center justify-center mb-4 border border-brand-green/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">All Caught Up!</h3>
              <p className="text-text-secondary max-w-md">
                You have reviewed all pending AI actions. GreenShop is continuously monitoring your inventory for new optimizations.
              </p>
            </motion.div>
          )}

          {actions.map((action) => {
            const top = action.recommendations?.[0];
            const meta = top ? planMeta(top) : planMeta({ action_type: "DISCOUNT", params: {}, expected_outcome: 0, confidence: 0, reasoning: "" } as BackendRecommendation);
            const Icon = meta.icon;
            const planText = top
              ? `${top.action_type.charAt(0) + top.action_type.slice(1).toLowerCase()} — ${top.reasoning}`
              : action.risk_type;
            const isDone = done.has(action.id);
            return (
              <motion.div
                key={action.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, x: -50 }}
                className={`glass-panel p-6 relative overflow-hidden group ${isDone ? "opacity-60" : ""}`}
              >
                <div className={`absolute top-0 left-0 w-1 h-full ${meta.bg} ${meta.border}`} />

                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${meta.bg} ${meta.border} border`}>
                        <Icon className={`w-5 h-5 ${meta.color}`} />
                      </div>
                      <h3 className="text-xl font-semibold text-text-primary">{action.product_name}</h3>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-text-secondary bg-bg-app border border-border-default px-2 py-1 rounded">
                        {cardMeta(action.risk_type)}
                      </span>
                      <span className="text-xs font-bold text-red-500">{formatINR(action.value_at_risk ?? 0)} at risk</span>
                    </div>

                    <div className="pl-13">
                      <p className="text-text-secondary text-sm mb-3">
                        {action.risk_type} · severity {action.severity}
                      </p>
                      <div className="inline-flex items-start gap-2 bg-bg-app px-3 py-2 rounded-lg border border-border-default max-w-full">
                        <Zap className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                        <span className="text-sm font-medium text-text-primary">{planText}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0 pl-13 md:pl-0">
                    <button
                      onClick={() => handleExecute(action)}
                      disabled={!!working || isDone}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-brand-green text-black px-6 py-2.5 rounded-lg font-medium hover:bg-brand-green/90 transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)] disabled:opacity-50"
                    >
                      {working === action.id ? "Executing…" : "Execute Plan"}
                    </button>
                    <button
                      onClick={() => handleDismiss(action)}
                      disabled={!!working || isDone}
                      className="p-2.5 rounded-lg border border-border-default text-text-secondary hover:text-text-primary hover:bg-slate-100 transition-colors disabled:opacity-50"
                      title="Dismiss"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
