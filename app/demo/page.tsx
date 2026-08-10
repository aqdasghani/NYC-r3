"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Leaf, RefreshCw, Play, ShieldAlert, Users, LayoutDashboard,
  ShoppingCart, ScanLine, ArrowRight, CheckCircle2, Zap, Package, Sparkles, AlertTriangle
} from "lucide-react";
import { login } from "@/lib/api-client";

export default function DemoPage() {
  const router = useRouter();
  const [loggingInRole, setLoggingInRole] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleRoleLogin = async (email: string, pass: string, role: string, targetPath: string) => {
    setLoggingInRole(role);
    setStatusMessage(null);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("app_mode", "demo");
      }
      await login(email, pass);
      router.push(`${targetPath}?demo=true`);
    } catch {
      setStatusMessage(`Failed to log in as ${role}. Please ensure backend is running.`);
      setLoggingInRole(null);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setStatusMessage(null);
    try {
      const res = await fetch("http://localhost:8000/api/demo/reset", { method: "POST" });
      if (res.ok) {
        setStatusMessage("Demo data reset successfully! Restored clean synthetic store dataset.");
      } else {
        setStatusMessage("Demo reset endpoint responded with error.");
      }
    } catch {
      setStatusMessage("Could not connect to backend to reset demo data.");
    } finally {
      setResetting(false);
    }
  };

  const handleSimulateSales = async () => {
    setSimulating(true);
    setStatusMessage(null);
    try {
      // Fetch catalog products to perform POS sale simulation
      const res = await fetch("http://localhost:8000/api/inventory/products?page=1&page_size=5");
      const pageData = await res.json();
      const items = (pageData.items || []).map((p: any) => ({
        product_id: p.id,
        quantity: 2
      }));
      if (items.length > 0) {
        const authRaw = localStorage.getItem("Green Quant_auth");
        const token = authRaw ? JSON.parse(authRaw).access_token : "";
        const saleRes = await fetch("http://localhost:8000/api/pos/sale", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ items, payment_method: "CASH", amount_paid: 1000 })
        });
        if (saleRes.ok) {
          setStatusMessage("Simulated 5 POS Sales! FEFO batch stock deducted & sales recorded.");
        } else {
          setStatusMessage("Sale simulation required active authentication.");
        }
      } else {
        setStatusMessage("No products found to simulate sales.");
      }
    } catch {
      setStatusMessage("Simulation failed — ensure backend is running.");
    } finally {
      setSimulating(false);
    }
  };

  const demoAccounts = [
    {
      role: "OWNER",
      name: "Rahul Sharma",
      email: "rahul@greenshop.ai",
      pass: "demo1234",
      desc: "Full dashboard, financial reports, AI recommendations & Green Score metrics",
      path: "/dashboard",
      icon: LayoutDashboard,
      color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
    },
    {
      role: "MANAGER",
      name: "Priya Verma",
      email: "priya@greenshop.ai",
      pass: "demo1234",
      desc: "Inventory management, supplier POs, transfers & stock editing",
      path: "/dashboard/inventory",
      icon: Users,
      color: "border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
    },
    {
      role: "BILLER",
      name: "Neha Singh",
      email: "neha@greenshop.ai",
      pass: "demo1234",
      desc: "POS terminal, barcode scanner, receipt generation & checkout",
      path: "/dashboard/pos",
      icon: ShoppingCart,
      color: "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
    },
    {
      role: "WORKER",
      name: "Amit Kumar",
      email: "amit@greenshop.ai",
      pass: "demo1234",
      desc: "Smart receiving, barcode camera scan, invoice OCR uploading",
      path: "/dashboard/scanner",
      icon: ScanLine,
      color: "border-purple-500/40 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
    },
  ];

  const showcaseFeatures = [
    {
      title: "POS Terminal & GST Receipts",
      desc: "Fast barcode checkout with automatic FEFO batch inventory deduction and itemized GST calculations.",
      href: "/dashboard/pos?demo=true",
      icon: ShoppingCart,
      tag: "POS"
    },
    {
      title: "Barcode Camera & Invoice OCR",
      desc: "Real-time camera barcode scanning and Gemini 2.5 Flash invoice extraction with fuzzy catalogue matching.",
      href: "/dashboard/scanner?demo=true",
      icon: ScanLine,
      tag: "SCANNER"
    },
    {
      title: "FEFO Inventory & Expiry Timeline",
      desc: "First-Expired, First-Out batch allocation, 4-tier expiry buckets, and dead-stock identification.",
      href: "/dashboard/inventory?demo=true",
      icon: Package,
      tag: "INVENTORY"
    },
    {
      title: "AI Action Engine & Recommendations",
      desc: "Automated risk detection sweeps generating grounded interventions: Discount, Transfer, Return, Reorder.",
      href: "/dashboard/actions?demo=true",
      icon: Sparkles,
      tag: "AI ACTIONS"
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 md:p-10 font-sans selection:bg-[#0FA958] selection:text-black">
      {/* Background Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#0FA958]/10 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-5xl mx-auto w-full space-y-10 relative z-10">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0FA958] flex items-center justify-center shadow-[0_0_25px_rgba(15,169,88,0.4)]">
              <Leaf className="w-7 h-7 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Green Quant AI
              </h1>
              <p className="text-xs text-emerald-400 font-semibold tracking-wide uppercase">
                Interactive Demo Portal & Simulation Center
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              DEMO MODE ISOLATED
            </div>
          </div>
        </div>

        {/* Banner Alert & Status Message */}
        {statusMessage && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm rounded-xl flex items-center gap-3 font-medium animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Hero Section */}
        <div className="glass-panel p-6 md:p-8 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-3 text-amber-400">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <h2 className="font-bold text-base tracking-wide">Production vs Demo Mode Isolation</h2>
          </div>
          
          <p className="text-slate-300 text-sm leading-relaxed max-w-3xl">
            This demo portal operates on a synthetic store dataset simulating a live kirana retail business (Rahul SuperMart).
            Production data remains completely isolated and zeroed out until real business transactions occur.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/dashboard?demo=true"
              className="bg-[#0FA958] text-black px-7 py-3 rounded-xl font-extrabold hover:bg-[#0FA958]/90 transition-all shadow-[0_0_25px_rgba(15,169,88,0.3)] flex items-center gap-2.5 text-sm"
            >
              <Play className="w-4 h-4 fill-black" /> Launch Demo Dashboard
            </Link>

            <button
              onClick={handleSimulateSales}
              disabled={simulating}
              className="border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-emerald-400" />
              {simulating ? "Simulating POS..." : "Simulate 5 POS Sales"}
            </button>

            <button
              onClick={handleReset}
              disabled={resetting}
              className="border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${resetting ? "animate-spin" : ""}`} /> Reset Demo Data
            </button>
          </div>
        </div>

        {/* Section 1: One-Click Demo Role Accounts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" /> Instant Demo Role Login
            </h3>
            <span className="text-xs text-slate-500">Click to switch role session</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {demoAccounts.map((acc, i) => (
              <div
                key={i}
                className={`p-5 rounded-2xl border ${acc.color} transition-all duration-200 flex flex-col justify-between space-y-4 group`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                      <acc.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-white flex items-center gap-2">
                        {acc.name}
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                          {acc.role}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{acc.email}</div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {acc.desc}
                </p>

                <button
                  onClick={() => handleRoleLogin(acc.email, acc.pass, acc.role, acc.path)}
                  disabled={loggingInRole === acc.role}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-700 font-bold text-xs text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 group-hover:border-emerald-500/50"
                >
                  {loggingInRole === acc.role ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Logging in...
                    </>
                  ) : (
                    <>
                      Log in as {acc.role} <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Interactive Feature Showcase */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" /> Key Product Capabilities
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {showcaseFeatures.map((feat, i) => (
              <Link
                key={i}
                href={feat.href}
                className="glass-panel p-5 bg-slate-900/40 border border-slate-800 rounded-2xl hover:border-emerald-500/40 transition-all group flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {feat.tag}
                  </span>
                  <feat.icon className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">{feat.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{feat.desc}</p>
                </div>
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 pt-1">
                  Try {feat.title} <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="max-w-5xl mx-auto w-full pt-10 text-center text-xs text-slate-600 border-t border-slate-900 mt-10">
        Green Quant AI — Production Mode (Real Data) vs Demo Mode (Isolated Seed Data)
      </div>
    </div>
  );
}
