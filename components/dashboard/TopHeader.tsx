"use client";

import React, { useEffect, useState } from "react";
import { Menu, Bell, ChevronDown, CheckCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/api-client";
import { getNotifications } from "@/lib/api";
import { subscribeLive } from "@/lib/live";
import { timeAgo } from "@/lib/utils";
import { titleForPath } from "./NavItems";
import type { AppNotification } from "@/lib/types";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const NOTIF_TONE: Record<string, string> = {
  danger: "bg-red-50 text-red-600",
  success: "bg-emerald-50 text-emerald-600",
  info: "bg-blue-50 text-blue-600",
};

function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const rows = await getNotifications();
      if (!cancelled) {
        setItems(rows);
        setLoaded(true);
      }
    };
    void load();
    const unsub = subscribeLive((event) => {
      if (event.type === "notification_created") void load();
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label={`Notifications (${unread} unread)`}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
              {unread > 0 && (
                <button
                  onClick={() => setItems((prev) => prev.map((n) => ({ ...n, read: true })))}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {!loaded ? (
                <li className="px-4 py-6 text-center text-xs text-slate-400">Loading…</li>
              ) : items.length === 0 ? (
                <li className="px-4 py-6 text-center text-xs text-slate-400">You're all caught up.</li>
              ) : (
                items.map((n) => (
                  <li key={n.id} className={`flex items-start gap-3 px-4 py-3 ${n.read ? "" : "bg-emerald-50/50"}`}>
                    <span className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] ${NOTIF_TONE[n.type] ?? "bg-slate-100 text-slate-500"}`}>
                      <Bell className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className={`text-xs ${n.read ? "font-medium text-slate-600" : "font-bold text-slate-900"}`}>{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{n.body}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

interface TopHeaderProps {
  onMenuClick?: () => void;
}

export function TopHeader({ onMenuClick }: TopHeaderProps) {
  const pathname = usePathname();
  const now = useClock();
  const user = getCurrentUser();

  const dateLabel = now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const timeLabel = now.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  const initials = (user?.name ?? "GS")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 md:text-xl">{titleForPath(pathname)}</h1>
          <p className="hidden text-[11px] text-slate-400 sm:block">{dateLabel}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 lg:flex">
          <span className="text-sm font-medium text-slate-700">GreenMart · MG Road</span>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </div>

        <div className="hidden items-center gap-1.5 text-sm font-medium text-slate-500 md:flex">
          <span className="tabular-nums">{timeLabel}</span>
        </div>

        <NotificationBell />

        <div className="flex items-center gap-3 border-l border-slate-200 pl-3 md:pl-4">
          <div className="hidden text-right sm:block">
            <div className="text-xs font-semibold text-slate-800">{user?.name ?? "Store Owner"}</div>
            <div className="text-[10px] text-slate-400">{user?.role ?? "Manager"}</div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white">{initials}</div>
        </div>
      </div>
    </header>
  );
}
