"use client";

import { create } from "zustand";
import { notifications as seed } from "@/lib/data";
import type { AppNotification } from "@/lib/types";

interface NotificationState {
  notifications: AppNotification[];
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: seed,
  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),
}));

export const selectUnreadCount = (s: NotificationState) =>
  s.notifications.filter((n) => !n.read).length;
