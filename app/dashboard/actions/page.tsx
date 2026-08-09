"use client";

import React, { useEffect, useState } from "react";
import { Zap, Tag, RefreshCw, ShoppingCart, CornerDownLeft, CheckCircle2, XCircle, ScanSearch, AlertTriangle } from "lucide-react";
import { dismissAction, executeAction, generateActions, getActions } from "@/lib/api";
import { subscribeLive } from "@/lib/live";
import type { ActionOut, BackendRecommendation } from "@/lib/backend-types";
import { formatINR } from "@/lib/utils";
import { Card, Badge, Button, Tabs, type TabItem, EmptyState, KpiCard } from "@/components/ui";

function planMeta(action: BackendRecommendation) {
  switch (action.action_type) {
    case "TRANSFER":
      return { icon: RefreshCw, label: "Transfer" };
    case "REORDER":
      return { icon: ShoppingCart, label: "Reorder" };
    case "RETURN":
      return { icon: CornerDownLeft, label: "Return" };
    case "DISCOUNT":
    default:
      return { icon: Tag, label: "Discount" };
  }
}

function cardMeta(riskType: string) {
  const t = riskType.toLowerCase();
  if (t.includes("overstock") || t.includes("dead")) return "Transfer / Return";
  if (t.includes("stockout") || t.includes("demand")) return "Procurement";
  if (t.includes("expiry")) return "Sell First";
  return "Action Needed";
}

type ActionTab = "ALL" | "CRITICAL" | "IMPORTANT" | "OPPORTUNITY";

const TABS: TabItem[] = [
  { key: "ALL", label: "All" },
  { key: "CRITICAL", label: "Critical" },
  { key: "IMPORTANT", label: "Important" },
  { key: "OPPORTUNITY", label: "Opportunity" },
];

export default function ActionsPage() {
  const [actions, setActions] = useState<ActionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActionTab>("ALL");
  const [explainAction, setExplainAction] = useState<ActionOut | null>(null);

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

  const filteredActions = actions.filter((action) => {
    if (activeTab === "CRITICAL") return action.severity === "CRITICAL" || action.risk_type.toLowerCase().includes("expiry") || action.risk_type.toLowerCase().includes("stockout");
    if (activeTab === "IMPORTANT") return action.severity === "WARNING" || action.risk_type.toLowerCase().includes("waste");
    if (activeTab === "OPPORTUNITY") return action.risk_type.toLowerCase().includes("demand") || action.risk_type.toLowerCase().includes("overstock") || action.risk_type.toLowerCase().includes("dead");
    return true;
  });

  const criticalCount = actions.filter((a) => a.severity === "CRITICAL" || a.risk_type.toLowerCase().includes("expiry") || a.risk_type.toLowerCase().includes("stockout")).length;
  const importantCount = actions.filter((a) => a.severity === "WARNING" || a.risk_type.toLowerCase().includes("waste")).length;
  const opportunityCount = actions.filter((a) => a.risk_type.toLowerCase().includes("demand") || a.risk_type.toLowerCase().includes("overstock") || a.risk_type.toLowerCase().includes("dead")).length;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink flex items-center gap-2">
            <Zap className="w-5 h-5 text-brand" />
            AI Action Engine
          </h1>
          <p className="mt-1 text-sm text-muted">Review and execute AI-generated strategies to prevent waste and maximize profit.</p>
        </div>
        <Button onClick={handleScan} disabled={busy}>
          <ScanSearch className={`w-4 h-4 mr-2 ${busy ? "animate-pulse" : ""}`} />
          {busy ? "Scanning…" : "Run AI Scan"}
        </Button>
      </div>

      {scanResult && (
        <div className="p-4 bg-success-soft border border-success/30 rounded-lg text-sm font-medium text-success flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {scanResult}
        </div>
      )}

      <Tabs items={TABS} active={activeTab} onChange={(k) => setActiveTab(k as ActionTab)} className="mb-6" />

      {loading ? (
        <Card>
          <div className="p-8 text-center text-muted">Loading AI actions…</div>
        </Card>
      ) : filteredActions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CheckCircle2 className="h-12 w-12 text-success/50" />}
            title={actions.length === 0 ? "All Caught Up!" : "No actions in this category"}
            description={
              actions.length === 0
                ? "You have reviewed all pending AI actions. Green Quant is continuously monitoring your inventory for new optimizations."
                : "All clear for this priority level."
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredActions.map((action) => {
            const top = action.recommendations?.[0];
            const meta = top ? planMeta(top) : planMeta({ action_type: "DISCOUNT", params: {}, expected_outcome: 0, confidence: 0, reasoning: "" } as BackendRecommendation);
            const Icon = meta.icon;
            const planText = top
              ? `${top.action_type.charAt(0) + top.action_type.slice(1).toLowerCase()} — ${top.reasoning}`
              : action.risk_type;
            const isDone = done.has(action.id);
            const severityTone = action.severity === "CRITICAL" ? "danger" : action.severity === "WARNING" ? "warning" : "info";

            return (
              <Card key={action.id} className={`p-6 relative ${isDone ? "opacity-60" : ""}`}>
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <div className="w-10 h-10 rounded-lg bg-brand-soft border border-brand/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-brand" />
                      </div>
                      <h3 className="text-lg font-semibold text-ink truncate">{action.product_name}</h3>
                      <Badge tone="neutral">{cardMeta(action.risk_type)}</Badge>
                      <Badge tone={severityTone}>{action.severity || "ALERT"}</Badge>
                      <span className="text-xs font-semibold text-danger">{formatINR(action.value_at_risk ?? 0)} at risk</span>
                    </div>

                    <div className="ml-13">
                      <p className="text-sm text-muted mb-3">
                        {action.risk_type} · severity {action.severity}
                      </p>
                      <div className="inline-flex items-start gap-2 bg-subtle px-3 py-2 rounded-lg border border-line max-w-full">
                        <Zap className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                        <span className="text-sm font-medium text-ink">{planText}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 w-full md:w-auto mt-4 md:mt-0 ml-13 md:ml-0 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExplainAction(action)}
                      className="text-xs"
                    >
                      Why / Calculate?
                    </Button>
                    <Button
                      onClick={() => handleExecute(action)}
                      disabled={!!working || isDone}
                      className="flex-1 md:flex-none text-xs"
                    >
                      {working === action.id ? "Executing…" : "Execute Plan"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismiss(action)}
                      disabled={!!working || isDone}
                      className="text-xs text-danger hover:text-danger"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {explainAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-line">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" /> Math Engine Reasoning
              </h3>
              <button onClick={() => setExplainAction(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-xs text-slate-500">Target Product</div>
                <div className="font-bold text-slate-900 text-base">{explainAction.product_name}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="text-xs text-amber-700">Risk Type</div>
                  <div className="font-bold text-amber-900">{explainAction.risk_type}</div>
                </div>
                <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                  <div className="text-xs text-red-700">Value at Risk</div>
                  <div className="font-bold text-red-900">{formatINR(explainAction.value_at_risk || 0)}</div>
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-xl border border-green-100 space-y-2">
                <div className="font-bold text-green-900 text-xs uppercase tracking-wider">Recommended Strategy</div>
                <p className="text-slate-800 font-semibold text-sm">
                  {explainAction.recommendations?.[0]?.action_type}: {explainAction.recommendations?.[0]?.reasoning || "Optimized based on remaining shelf-life & demand decay model."}
                </p>
                <div className="text-xs text-green-700 font-bold">
                  Expected Impact: {formatINR(explainAction.recommendations?.[0]?.expected_outcome || explainAction.value_at_risk || 0)} waste prevented
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <Button variant="outline" onClick={() => setExplainAction(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  const target = explainAction;
                  setExplainAction(null);
                  handleExecute(target);
                }}
              >
                Execute Plan Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}