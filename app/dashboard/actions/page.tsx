"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ScanSearch, CheckCircle2, AlertTriangle, 
  XCircle, Zap, TrendingDown, BadgePercent,
  ArrowRightLeft, RotateCcw, PackagePlus
} from "lucide-react";
import { getActions, executeAction, dismissAction, generateActions } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import type { ActionOut, BackendRecommendation } from "@/lib/backend-types";
import { GlassCard } from "@/components/ui/GlassCard";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function getRiskBadgeColor(severity: string) {
  if (severity === "CRITICAL") return "bg-red-100 text-red-800 border-red-200";
  if (severity === "WARNING") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-blue-100 text-blue-800 border-blue-200";
}

export default function ActionsPage() {
  const [actions, setActions] = useState<ActionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("All");

  const load = async () => {
    setLoading(true);
    try {
      const rows = await getActions("PENDING");
      setActions(rows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleExecute = async (action: ActionOut) => {
    const selected = action.recommendations?.[0];
    if (!selected || working) return;
    setWorking(action.id);
    try {
      const result = await executeAction(action.id, selected);
      setActions((prev) => prev.filter((a) => a.id !== action.id));
      setScanResult(
        `${result.intervention} executed – ${formatINR(result.waste_prevented)} waste prevented, Green Score +${result.green_score_delta}`
      );
    } catch (e) {
      setScanResult("Could not execute this action.");
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
      setScanResult(`Detection run complete – ${result.risks_detected} risks, ${result.recommendations_created} new actions.`);
      await load();
    } catch (e) {
      setScanResult("Detection run failed.");
    } finally {
      setBusy(false);
    }
  };

  const filters = ["All", "CRITICAL", "WARNING", "Expiry", "Overstock", "Stockout", "Margin"];

  const filteredActions = useMemo(() => {
    let result = [...actions];
    if (filter !== "All") {
      if (filter === "CRITICAL" || filter === "WARNING") {
        result = result.filter(a => a.severity === filter);
      } else {
        result = result.filter(a => a.risk_type.toLowerCase().includes(filter.toLowerCase()));
      }
    }
    // Sort by value_at_risk descending
    result.sort((a, b) => (b.value_at_risk || 0) - (a.value_at_risk || 0));
    return result;
  }, [actions, filter]);

  const criticalActions = filteredActions.filter(a => a.severity === "CRITICAL");
  const highPriorityActions = filteredActions.filter(a => a.severity === "WARNING" && (a.value_at_risk || 0) > 1000);
  const optimizationActions = filteredActions.filter(a => !criticalActions.includes(a) && !highPriorityActions.includes(a));

  const renderActionCard = (action: ActionOut) => {
    const topRec = action.recommendations?.[0];
    if (!topRec) return null;

    let ActionIcon = Zap;
    if (topRec.action_type === "DISCOUNT") ActionIcon = BadgePercent;
    if (topRec.action_type === "TRANSFER") ActionIcon = ArrowRightLeft;
    if (topRec.action_type === "RETURN") ActionIcon = RotateCcw;
    if (topRec.action_type === "REORDER") ActionIcon = PackagePlus;

    return (
      <motion.div key={action.id} layout initial="hidden" animate="show" exit={{ opacity: 0, scale: 0.95 }} variants={itemVariants}>
        <GlassCard className="p-0 overflow-hidden border border-border-default hover:border-brand-green/50 transition-colors">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-border-default bg-slate-50/50">
            <div className="flex items-center gap-3">
              {action.severity === "CRITICAL" && <AlertTriangle className="w-5 h-5 text-red-500" />}
              {action.severity === "WARNING" && <AlertTriangle className="w-5 h-5 text-amber-500" />}
              {action.severity !== "CRITICAL" && action.severity !== "WARNING" && <TrendingDown className="w-5 h-5 text-blue-500" />}
              
              <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${getRiskBadgeColor(action.severity)}`}>
                {action.risk_type}
              </span>
            </div>
            {action.value_at_risk !== null && (
              <div className="text-sm font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                {formatINR(action.value_at_risk)} at risk
              </div>
            )}
          </div>

          <div className="p-5">
            <h3 className="text-xl font-bold text-text-primary mb-4">{action.product_name}</h3>
            
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Why this matters</h4>
              <p className="text-sm text-text-primary bg-amber-50/50 p-3 rounded-lg border border-amber-100/50">
                {topRec.reasoning}
              </p>
            </div>
            
            <div className="mb-5">
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Recommendation</h4>
              <div className="flex items-start gap-3 bg-brand-green/5 p-4 rounded-lg border border-brand-green/20">
                <div className="bg-brand-green/20 p-2 rounded-lg">
                  <ActionIcon className="w-5 h-5 text-brand-green-dark" />
                </div>
                <div>
                  <p className="font-semibold text-text-primary">
                    {topRec.action_type}: {JSON.stringify(topRec.params).replace(/[{}"\\]/g, ' ')}
                  </p>
                  <div className="flex gap-4 mt-2 text-sm text-text-secondary">
                    <span>Expected Impact: <strong className="text-brand-green-dark">{formatINR(topRec.expected_outcome)}</strong></span>
                    <span>Confidence: <strong>{(topRec.confidence * 100).toFixed(0)}%</strong></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleExecute(action)}
                disabled={!!working}
                className="flex-1 bg-brand-green text-black px-4 py-2 rounded-lg font-semibold hover:bg-brand-green-dark hover:text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {working === action.id ? "Executing..." : "Accept"}
              </button>
              <button
                onClick={() => handleDismiss(action)}
                disabled={!!working}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Dismiss
              </button>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    );
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">AI Action Engine</h1>
          <p className="text-text-secondary">
            Review and execute AI-generated strategies to prevent waste and maximize profit.
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={busy}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <ScanSearch className={`w-4 h-4 ${busy ? "animate-pulse" : ""}`} />
          {busy ? "Scanning..." : "Run AI Scan"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              filter === f 
                ? "bg-slate-800 text-white border-slate-800" 
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {scanResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-3 text-sm"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {scanResult}
        </motion.div>
      )}

      {loading && (
        <div className="p-12 text-center text-text-secondary animate-pulse">Loading AI intelligence...</div>
      )}

      <AnimatePresence>
        {!loading && actions.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-panel p-16 text-center flex flex-col items-center justify-center border border-dashed border-slate-300"
          >
            <div className="w-16 h-16 bg-green-100 text-brand-green rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">All Clear! No pending recommendations.</h3>
            <p className="text-slate-500 max-w-md">
              Your inventory is fully optimized. Green Quant will notify you when new risks are detected.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        {criticalActions.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              🔴 Critical Interventions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {criticalActions.map(renderActionCard)}
            </div>
          </section>
        )}

        {highPriorityActions.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              🟡 High Priority
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {highPriorityActions.map(renderActionCard)}
            </div>
          </section>
        )}

        {optimizationActions.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              🟢 Optimization Opportunities
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {optimizationActions.map(renderActionCard)}
            </div>
          </section>
        )}
      </div>
    </motion.div>
  );
}
