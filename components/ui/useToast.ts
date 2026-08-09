"use client";

import { create } from "zustand";
import type { Toast, ToastVariant } from "@/lib/types";

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
}

function makeId() {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = makeId();
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    const duration = t.duration ?? 4200;
    if (duration > 0) {
      setTimeout(() => get().dismiss(id), duration);
    }
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Convenience wrapper: fire-and-forget toast calls. */
export const toast = {
  success: (title: string, message?: string, duration?: number) =>
    useToastStore.getState().push({ title, message, variant: "success", duration }),
  info: (title: string, message?: string, duration?: number) =>
    useToastStore.getState().push({ title, message, variant: "info", duration }),
  error: (title: string, message?: string, duration?: number) =>
    useToastStore.getState().push({ title, message, variant: "error", duration }),
  action: (title: string, message?: string, duration?: number) =>
    useToastStore.getState().push({ title, message, variant: "action", duration }),
};

export type { ToastVariant };
