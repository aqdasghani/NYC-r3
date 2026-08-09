"use client";

import React, { useEffect, useState } from "react";
import { Bell, AlertTriangle, ShieldCheck, RefreshCw, ShoppingCart, Tag, CornerDownLeft, CheckCircle2, ScanSearch, Zap } from "lucide-react";
import { dismissAction, executeAction, generateActions, getActions } from "@/lib/api";
import { subscribeLive } from "@/lib/live";
import type { ActionOut, BackendRecommendation } from "@/lib/backend-types";
import { formatINR } from "@/lib/utils";
import { Card, Badge, Button, EmptyState } from "@/components/ui";

function planMeta(action: BackendRecommendation) {
  switch (action.action_type) {
    case "TRANSFER":
      return { icon: RefreshCw };
    case "REORDER":
      return { icon: ShoppingCart };
    case "RETURN":
      return { icon: CornerDownLeft };
    case "DISCOUNT":
    default:
      return { icon: Tag };
  }
}

export default function AlertsPage() {
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
        `Action executed: ${result.intervention} — ${formatINR(result.waste_prevented)} waste prevented`
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
      const res = await generateActions();
      setScanResult(`Detection engine finished: ${res.recommendations_created} recommendation(s) created from ${res.risks_detected} risk signal(s).`);
      await load();
    } catch {
      setScanResult("Detection failed. Please check backend service status.");
    } finally {
      setBusy(false);
    }
  };

  const safeActions = Array.isArray(actions) ? actions : [];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-danger-soft flex items-center justify-center">
            <Bell className="w-5 h-5 text-danger" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Store Risk Alerts</h1>
            <p className="mt-0.5 text-sm text-muted">Real-time alerts for expiry risk, stockout hazard, and dead stock clearance</p>
          </div>
        </div>

        <Button onClick={handleScan} disabled={busy}>
          {busy ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <ScanSearch className="w-4 h-4 mr-2" />}
          Run Risk Scanner
        </Button>
      </div>

      {scanResult && (
        <div className="p-4 rounded-lg bg-success-soft border border-success/30 text-success text-sm font-medium flex items-center justify-between">
          <span>{scanResult}</span>
          <button onClick={() => setScanResult(null)} className="font-bold text-success hover:underline">Dismiss</button>
        </div>
      )}

      {loading ? (
        <Card>
          <div className="flex items-center justify-center h-64 text-muted gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-brand" />
            <span className="text-sm font-medium">Loading pending store alerts...</span>
          </div>
        </Card>
      ) : safeActions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CheckCircle2 className="h-12 w-12 text-success/50" />}
            title="All Store Alerts Cleared!"
            description="There are currently no urgent stockout or expiry risk alerts pending. Run the Risk Scanner to check catalog inventory against live rules."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {safeActions.map((act) => {
            const rec = act.recommendations?.[0];
            const meta = rec ? planMeta(rec) : { icon: AlertTriangle };
            const Icon = meta.icon;
            const isWorking = working === act.id;
            const severityTone = act.severity === "CRITICAL" ? "danger" : act.severity === "WARNING" ? "warning" : "info";

            return (
              <Card key={act.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl border bg-subtle shrink-0`}>
                    <Icon className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-ink text-sm">{act.product_name} — {act.risk_type}</h4>
                      <Badge tone={severityTone}>{act.severity || "ALERT"}</Badge>
                    </div>
                    <p className="text-xs text-muted mt-1">Value at Risk: {formatINR(act.value_at_risk || 0)}</p>
                    {rec && (
                      <div className="text-xs font-medium text-brand mt-2 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-warning" /> Action: {rec.action_type} ({rec.reasoning})
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDismiss(act)}
                    disabled={isWorking}
                    className="text-xs"
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleExecute(act)}
                    disabled={isWorking}
                    className="text-xs"
                  >
                    {isWorking && <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                    Execute Action
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}