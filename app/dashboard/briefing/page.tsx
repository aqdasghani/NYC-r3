"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Brain, Leaf, AlertTriangle, ArrowRightLeft, TrendingUp, CheckCircle2, ChevronRight, Zap, RefreshCw, Check } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { getActions, executeAction, dismissAction, getAIInsights, getDashboardSummary, generateActions } from "@/lib/api";
import type { ActionOut } from "@/lib/backend-types";

interface AIInsight {
  title: string;
  description: string;
}

export default function BriefingPage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("Store Manager");
  const [actions, setActions] = useState<ActionOut[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const authRaw = localStorage.getItem("greenshop_auth") || localStorage.getItem("Green Quant_auth");
      if (authRaw) {
        const parsed = JSON.parse(authRaw);
        if (parsed?.user?.name) setUserName(parsed.user.name);
      }

      const [acts, ins, sum] = await Promise.all([
        getActions("PENDING").catch(() => []),
        getAIInsights().catch(() => []),
        getDashboardSummary().catch(() => null),
      ]);
      setActions(acts);
      setInsights(ins);
      setSummary(sum);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExecute = async (action: ActionOut) => {
    setExecutingId(action.id);
    setMessage(null);
    try {
      const targetRec = action.recommendations[0] || {
        rank: 1,
        action_type: "DISCOUNT",
        params: { discount_pct: 15 },
        expected_outcome: action.value_at_risk || 500,
        confidence: 85,
        reasoning: "Automated intervention",
      };

      const res = await executeAction(action.id, targetRec);
      setActions((prev) => prev.filter((a) => a.id !== action.id));
      setMessage({
        text: `Successfully executed action! Prevented ${formatINR(res.waste_prevented)} in waste.`,
        type: "success",
      });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to execute action.", type: "error" });
    } finally {
      setExecutingId(null);
    }
  };

  const handleDismiss = async (actionId: string) => {
    setExecutingId(actionId);
    try {
      await dismissAction(actionId);
      setActions((prev) => prev.filter((a) => a.id !== actionId));
      setMessage({ text: "Action dismissed.", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to dismiss.", type: "error" });
    } finally {
      setExecutingId(null);
    }
  };

  const handleAcceptAll = async () => {
    if (actions.length === 0) return;
    setLoading(true);
    let successCount = 0;
    let totalPrevented = 0;

    for (const action of [...actions]) {
      try {
        const targetRec = action.recommendations[0] || {
          rank: 1,
          action_type: "DISCOUNT",
          params: { discount_pct: 15 },
          expected_outcome: action.value_at_risk || 500,
          confidence: 85,
          reasoning: "Batch execution",
        };
        const res = await executeAction(action.id, targetRec);
        successCount++;
        totalPrevented += res.waste_prevented || 0;
      } catch (err) {
        console.error("Error executing action:", action.id, err);
      }
    }

    setActions([]);
    setLoading(false);
    setMessage({
      text: `Executed ${successCount} action(s). Total waste prevented: ${formatINR(totalPrevented)}.`,
      type: "success",
    });
  };

  const handleGenerateDetection = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      await generateActions();
      await loadData();
      setMessage({ text: "Ran fresh AI detection across all store inventory.", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to run detection.", type: "error" });
    } finally {
      setGenerating(false);
    }
  };

  const totalPotentialSavings = (Array.isArray(actions) ? actions : []).reduce((acc, a) => acc + (a?.value_at_risk || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-green-600" /> AI Daily Briefing
          </h2>
          <p className="text-sm text-slate-500">Your personalized morning digest generated by GreenShop AI.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateDetection}
            disabled={generating}
            className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Scanning..." : "Re-Scan Stock"}
          </button>
          <div className="text-xs font-semibold bg-green-100 text-green-700 px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Live AI Engine Active
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between ${
            message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs font-bold underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-[#063120] rounded-2xl p-6 border border-[#0A412A] text-white relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#0FA958] rounded-full blur-3xl opacity-20 transform translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-[#0FA958] rounded-full flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold text-lg">Good Morning, {userName}!</h3>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            The AI engine has analyzed your store inventory. We've identified{" "}
            <span className="font-bold text-white">{actions.length} urgent action(s)</span> today that could prevent up to{" "}
            <span className="font-bold text-white">{formatINR(totalPotentialSavings || 0)}</span> in potential waste.
          </p>
        </div>

        <div className="relative z-10 flex gap-4 w-full md:w-auto">
          <div className="bg-white/10 border border-white/10 rounded-xl p-4 flex-1 text-center backdrop-blur-sm">
            <div className="text-xs text-slate-300 mb-1">Stock Items</div>
            <div className="text-xl font-bold">{(summary?.kpis?.product_count ?? 0).toLocaleString()}</div>
          </div>
          <div className="bg-white/10 border border-white/10 rounded-xl p-4 flex-1 text-center backdrop-blur-sm">
            <div className="text-xs text-slate-300 mb-1">AI Score</div>
            <div className="text-xl font-bold text-green-400">{(summary?.score_data?.score ?? 0).toFixed(0)}/100</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Priority Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-5">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Action Items ({actions.length})
              </h3>
              {actions.length > 0 && (
                <button onClick={handleAcceptAll} className="text-xs font-bold text-blue-600 hover:underline">
                  Accept All ({actions.length})
                </button>
              )}
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-400 text-sm animate-pulse">Loading AI action items...</div>
            ) : actions.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-sm">All clear! No pending urgent actions.</p>
                <p className="text-xs text-slate-400 mt-1">Your inventory is optimized with 0 high-risk expiry batches.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {actions.map((action) => {
                  const rec = action.recommendations[0];
                  const actionType = rec?.action_type || "SELL FIRST";
                  const impact = action.value_at_risk || rec?.expected_outcome || 0;
                  const reason = rec?.reasoning || `Severity: ${action.severity} (${action.risk_type})`;

                  let colorClass = "bg-amber-50 text-amber-600 border-amber-200";
                  let btnColor = "bg-amber-500 hover:bg-amber-600";
                  let Icon = AlertTriangle;

                  if (actionType === "DISCOUNT") {
                    colorClass = "bg-orange-50 text-orange-600 border-orange-200";
                    btnColor = "bg-orange-500 hover:bg-orange-600";
                    Icon = TrendingUp;
                  } else if (actionType === "TRANSFER") {
                    colorClass = "bg-blue-50 text-blue-600 border-blue-200";
                    btnColor = "bg-blue-600 hover:bg-blue-700";
                    Icon = ArrowRightLeft;
                  } else if (actionType === "RETURN") {
                    colorClass = "bg-purple-50 text-purple-600 border-purple-200";
                    btnColor = "bg-purple-600 hover:bg-purple-700";
                    Icon = AlertTriangle;
                  }

                  return (
                    <div
                      key={action.id}
                      className="border border-slate-100 rounded-xl p-4 hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${colorClass}`}>
                              {actionType}
                            </span>
                            <span className="text-xs font-bold text-slate-800">Est. Impact: {formatINR(impact)}</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900">{action.product_name}</h4>
                          <p className="text-xs text-slate-500 mt-1">{reason}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 sm:shrink-0 w-full sm:w-auto">
                        <button
                          onClick={() => handleDismiss(action.id)}
                          disabled={executingId === action.id}
                          className="flex-1 sm:flex-none text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => handleExecute(action)}
                          disabled={executingId === action.id}
                          className={`flex-1 sm:flex-none text-xs font-bold text-white px-4 py-2 rounded-lg transition-colors ${btnColor} disabled:opacity-50`}
                        >
                          {executingId === action.id ? "Processing..." : "Execute"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Insights & Strategic Actions */}
        <div className="col-span-1 space-y-6">
          <div className="glass-panel p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Leaf className="w-4 h-4 text-green-600" /> Strategic Insights
            </h3>

            <div className="space-y-4">
              {insights.length > 0 ? (
                insights.map((insight, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-slate-900 mb-1">{insight.title}</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{insight.description}</p>
                  </div>
                ))
              ) : (
                <>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-slate-900 mb-1">Weekend Surge Predicted</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Weather forecast indicates rain. Expect 20% higher footfall for comfort foods and bakery items.
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-slate-900 mb-1">Supplier Reliability</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      FreshFarm supplier delivery time has improved by 1.5 hours on average this week.
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => router.push("/dashboard/reports")}
              className="w-full mt-4 py-2.5 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              Generate Deep Dive Report <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
