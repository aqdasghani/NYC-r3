"use client";

import { create } from "zustand";
import type { InvoiceDraft, InvoiceItem } from "@/lib/types";

interface WizardState {
  step: number; // 0 Upload · 1 AI Reads · 2 Confirm · 3 Done
  invoice: InvoiceDraft | null;
  setStep: (step: number) => void;
  setInvoice: (invoice: InvoiceDraft) => void;
  patchItem: (id: string, patch: Partial<InvoiceItem>) => void;
  reset: () => void;
}

export const useWizardStore = create<WizardState>((set) => ({
  step: 0,
  invoice: null,
  setStep: (step) => set({ step }),
  setInvoice: (invoice) => set({ invoice }),
  patchItem: (id, patch) =>
    set((s) => ({
      invoice: s.invoice
        ? {
            ...s.invoice,
            items: s.invoice.items.map((i) =>
              i.id === id ? { ...i, ...patch } : i
            ),
          }
        : s.invoice,
    })),
  reset: () => set({ step: 0, invoice: null }),
}));
