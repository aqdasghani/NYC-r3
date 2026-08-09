"use client";

import { useRef, useState } from "react";
import { Camera, FileText, Upload } from "lucide-react";
import { useWizardStore } from "@/stores/useWizardStore";
import { invoiceDraft } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";

export function StepUpload() {
  const setInvoice = useWizardStore((s) => s.setInvoice);
  const setStep = useWizardStore((s) => s.setStep);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const start = () => {
    setInvoice(invoiceDraft);
    setStep(1);
  };

  return (
    <div className="space-y-6">
      <GlassCard className="flex flex-col items-center justify-center px-6 py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-2xl" aria-hidden>
          📄
        </span>
        <h2 className="mt-4 font-heading text-xl font-bold text-ink">Invoice OCR</h2>
        <p className="mt-1 max-w-sm text-sm text-muted">
          Snap a supplier invoice and the AI extracts products, batch codes and expiry dates automatically.
        </p>
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Camera */}
        <button onClick={start} className="focus-ring group rounded-2xl border border-line bg-surface/50 p-6 text-left transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-glow-soft">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/12 text-accent transition-transform group-hover:scale-105">
            <Camera className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink">Camera</p>
          <p className="mt-1 text-xs text-muted">Point at the physical invoice</p>
        </button>

        {/* Upload / drop zone */}
        <button
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            start();
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "focus-ring group rounded-2xl border-2 border-dashed p-6 text-left transition-all hover:-translate-y-0.5",
            dragging ? "border-accent bg-accent/10 shadow-glow-soft" : "border-line bg-surface/50 hover:border-accent/40"
          )}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-info/12 text-info transition-transform group-hover:scale-105">
            <Upload className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink">Upload</p>
          <p className="mt-1 text-xs text-muted">Drag an image or PDF, or tap to browse</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={start}
          />
        </button>

        {/* Manual */}
        <button onClick={start} className="focus-ring group rounded-2xl border border-line bg-surface/50 p-6 text-left transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-glow-soft">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/12 text-warning transition-transform group-hover:scale-105">
            <FileText className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink">Manual Entry</p>
          <p className="mt-1 text-xs text-muted">Type the GRN details yourself</p>
        </button>
      </div>

      <div className="flex justify-center">
        <Button variant="ghost" size="sm" onClick={start}>
          Skip — use sample invoice
        </Button>
      </div>
    </div>
  );
}
