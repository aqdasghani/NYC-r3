"use client";

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

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/60 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <div className="min-w-0">
          {isDashboard ? (
            <>
              <h1 className="truncate font-heading text-xl font-bold text-ink sm:text-2xl">
                {greeting()}, Rahul 👋
              </h1>
              <p className="truncate text-sm text-muted">
                Here&apos;s what your store needs today · {today()}
              </p>
            </>
          ) : (
            <>
              <h1 className="truncate font-heading text-xl font-bold text-ink">{meta.title}</h1>
              <p className="truncate text-sm text-muted">{meta.subtitle}</p>
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
            aria-label="Rahul — Store owner"
          >
            RG
          </div>
        </div>
      </div>
    </header>
  );
}
