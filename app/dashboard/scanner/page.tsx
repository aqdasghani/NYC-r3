"use client";

import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ScanLine, CheckCircle2, AlertTriangle, Upload, RotateCcw, FileText } from "lucide-react";
import { confirmReceipt, scanInvoice } from "@/lib/api";
import type { ExtractedItem, ScanInvoiceResponse } from "@/lib/backend-types";
import { formatINR } from "@/lib/utils";

type Stage = "idle" | "scanning" | "preview" | "done";

export default function ScannerPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<ScanInvoiceResponse | null>(null);
  const [included, setIncluded] = useState<Set<number>>(new Set());
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    setStage("scanning");
    setError(null);
    setSummary(null);
    try {
      const res = await scanInvoice(file);
      setResult(res);
      setIncluded(new Set(res.extracted_items.map((_, i) => i)));
      setStage("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR failed — is the backend running?");
      setStage("idle");
    }
  };

  const toggle = (index: number) => {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!result) return;
    const selected = result.extracted_items
      .map((item, i) => ({ item, i }))
      .filter(({ i }) => included.has(i))
      .filter(({ item }) => item.matched_product_id);
    if (selected.length === 0) {
      setError("No matched products selected — only items matched to your catalogue can be added.");
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      const payload = selected.map(({ item }) => ({
        product_id: item.matched_product_id as string,
        quantity: item.quantity,
        purchase_price: item.price ?? undefined,
        expiry_date: item.expiry_date ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        batch_number: item.batch_number ?? undefined,
      }));
      const res = await confirmReceipt(payload);
      setSummary(
        `Added ${res.created_batch_ids.length} batch(es) — ${res.detection_summary.risks_detected} risks detected, ${res.detection_summary.recommendations_created} AI action(s) queued.`
      );
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm receipt");
    } finally {
      setConfirming(false);
    }
  };

  const reset = () => {
    setStage("idle");
    setResult(null);
    setIncluded(new Set());
    setFileName(null);
    setError(null);
    setSummary(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const matched = result?.extracted_items.filter((it) => it.matched_product_id).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Smart Receiving · Invoice OCR</h1>
          <p className="text-text-secondary">
            Upload a supplier invoice — Green Quant extracts products, batches and expiry dates, then you confirm.
          </p>
        </div>
        {stage !== "idle" && (
          <button
            onClick={reset}
            className="flex items-center gap-2 glass-panel px-4 py-2 rounded-lg text-sm font-medium hover:bg-bg-surface/80 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Start Over
          </button>
        )}
      </div>

      {error && (
        <div className="glass-panel border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-500 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload / scanning area */}
        <div className="glass-panel p-4 flex flex-col items-center justify-center min-h-[420px] relative overflow-hidden bg-slate-50 rounded-2xl">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />

          <AnimatePresence mode="wait">
            {stage === "idle" && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-4 mx-auto">
                  <Camera className="w-8 h-8 text-text-muted" />
                </div>
                <p className="text-text-secondary mb-2">Upload an invoice image or PDF.</p>
                <p className="text-xs text-text-muted mb-6">OCR + LLM extraction runs on the backend.</p>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="bg-brand-green text-black px-6 py-3 rounded-lg font-semibold hover:bg-brand-green/90 transition-colors shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center gap-2 mx-auto"
                >
                  <Upload className="w-4 h-4" /> Choose Invoice
                </button>
              </motion.div>
            )}

            {stage === "scanning" && (
              <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
                  className="w-16 h-16 rounded-2xl bg-brand-green/10 border-2 border-brand-green/50 flex items-center justify-center mb-4 mx-auto"
                >
                  <ScanLine className="w-8 h-8 text-brand-green" />
                </motion.div>
                <p className="text-text-primary font-medium">Extracting from {fileName ?? "invoice"}…</p>
                <p className="text-xs text-text-muted mt-2">Detecting products, quantities, batches & expiry</p>
              </motion.div>
            )}

            {stage === "done" && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-brand-green/10 border border-brand-green/30 flex items-center justify-center mb-4 mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-brand-green" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">Receipt Confirmed!</h3>
                <p className="text-text-secondary text-sm max-w-sm">{summary}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Extracted items */}
        <div className="space-y-4">
          {stage === "preview" && result && (
            <>
              <div className="glass-panel p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-text-primary flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-green" /> Extracted Items
                  </h3>
                  <span className="text-xs text-text-secondary">
                    {matched}/{result.extracted_items.length} matched
                  </span>
                </div>
                <div className="space-y-2 max-h-[380px] overflow-y-auto">
                  {result.extracted_items.map((item, i) => {
                    const on = included.has(i);
                    return (
                      <label
                        key={i}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          on ? "border-brand-green/40 bg-brand-green/5" : "border-border-default bg-bg-surface/40 opacity-70"
                        }`}
                      >
                        <input type="checkbox" checked={on} onChange={() => toggle(i)} className="mt-1 accent-[#0FA958]" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-text-primary truncate">{item.product_name}</span>
                            <span className="text-xs text-text-secondary shrink-0">× {item.quantity}</span>
                          </div>
                          <div className="text-xs text-text-muted mt-0.5 flex flex-wrap gap-x-3">
                            {item.price != null && <span>{formatINR(item.price)}</span>}
                            {item.batch_number && <span>Batch {item.batch_number}</span>}
                            {item.expiry_date && <span>Exp {item.expiry_date}</span>}
                          </div>
                          <div className="mt-1">
                            {item.matched_product_id ? (
                              <span className="text-[10px] text-brand-green font-semibold">✓ MATCHED · {Math.round(item.confidence * 100)}%</span>
                            ) : (
                              <span className="text-[10px] text-orange-400 font-semibold">NO CATALOGUE MATCH</span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={handleConfirm}
                disabled={confirming || matched === 0}
                className="w-full flex items-center justify-center gap-2 bg-brand-green text-black px-5 py-3 rounded-lg font-semibold hover:bg-brand-green/90 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5" />
                {confirming ? "Adding to inventory…" : `Confirm ${matched} item${matched === 1 ? "" : "s"} → Inventory`}
              </button>
            </>
          )}

          {stage === "done" && (
            <button onClick={reset} className="w-full glass-panel px-5 py-3 rounded-lg font-semibold hover:bg-bg-surface/80 transition-colors">
              Scan Another Invoice
            </button>
          )}

          {stage === "idle" && (
            <div className="glass-panel p-6 text-sm text-text-secondary leading-relaxed">
              <h4 className="font-bold text-text-primary mb-2">How it works</h4>
              <ul className="space-y-2 list-disc pl-5">
                <li>Upload a supplier invoice photo or PDF.</li>
                <li>Google Vision / LLM OCR extracts line items, quantities and prices.</li>
                <li>Items are matched to your catalogue by fuzzy name matching.</li>
                <li>Confirm to create inventory batches (FEFO) and queue AI actions.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
