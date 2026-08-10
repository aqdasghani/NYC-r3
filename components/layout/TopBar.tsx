"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { NotificationBell } from "./NotificationBell";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/inventory": {
    title: "Inventory",
    subtitle: "Batch-level control over everything on your shelves",
  },
  "/receiving": {
    title: "Smart Receiving",
    subtitle: "Snap an invoice — the AI does the rest",
  },
  "/actions": {
    title: "AI Action Engine",
    subtitle: "Decisions, not dashboards",
  },
  "/green-score": {
    title: "Green Score",
    subtitle: "Your sustainability, made measurable",
  },
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function today(): string {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Sticky top bar: greeting/date + notifications + avatar. Client-computed to avoid hydration flips. */
export function TopBar() {
  const pathname = usePathname();
  const isDashboard = pathname === "/";
  const meta = PAGE_META[pathname];

  const [userName, setUserName] = useState<string>("Rahul");
  const [storeName, setStoreName] = useState<string>("your store");
  const [initials, setInitials] = useState<string>("RG");

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("Green Quant_auth");
        if (raw) {
          const parsed = JSON.parse(raw);
          const name = parsed?.user?.name || "Rahul";
          const store = parsed?.user?.store_name || "your store";
          
          setUserName(name);
          setStoreName(store);
          
          const parts = name.split(" ");
          if (parts.length > 1) {
            setInitials((parts[0][0] + parts[parts.length - 1][0]).toUpperCase());
          } else if (name.length > 0) {
            setInitials(name.substring(0, 2).toUpperCase());
          }
        }
      } catch (e) {}
    }
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/60 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <div className="min-w-0">
          {isDashboard ? (
            <>
              <h1 className="truncate font-heading text-xl font-bold text-ink sm:text-2xl">
                {greeting()}, {userName.split(" ")[0]} 👋
              </h1>
              <p className="truncate text-sm text-muted">
                Here&apos;s what {storeName} needs today · {today()}
              </p>
            </>
          ) : (
            <>
              <h1 className="truncate font-heading text-xl font-bold text-ink">{meta?.title || "Page"}</h1>
              <p className="truncate text-sm text-muted">{meta?.subtitle || ""}</p>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden items-center gap-1.5 text-sm text-dim sm:flex">
            <span aria-hidden>☀️</span>
            {today()}
          </span>
          <NotificationBell />
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-safe text-sm font-bold text-bg ring-2 ring-accent/40"
            aria-label={`${userName} — Store owner`}
          >
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
