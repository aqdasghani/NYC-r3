"use client";

import Link from "next/link";
import { Boxes, LayoutDashboard, Leaf, ScanLine, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { GreenScoreRing } from "@/components/ui/GreenScoreRing";
import { SidebarLink } from "./SidebarLink";

const overview = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/receiving", label: "Smart Receiving", icon: ScanLine },
];

const insights = [
  { href: "/actions", label: "AI Actions", icon: Zap, badge: 4 },
  { href: "/green-score", label: "Green Score", icon: Leaf },
];

/**
 * Fixed 240px sidebar on desktop (lg+), icon-only 68px on tablet (md–lg),
 * hidden below md — BottomNav takes over there.
 */
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[68px] flex-col border-r border-line bg-sidebar md:flex lg:w-60">
      {/* Logo */}
      <Link
        href="/"
        className="flex h-16 shrink-0 items-center justify-center border-b border-line lg:justify-start lg:gap-3 lg:px-4"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Leaf className="h-5 w-5" />
        </span>
        <span className="hidden font-heading text-lg font-bold text-ink lg:inline">
          Green Quant <span className="text-accent">AI</span>
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        <div className="space-y-1">
          <p className="hidden px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-dim lg:block">
            Overview
          </p>
          {overview.map((item) => (
            <SidebarLink key={item.href} {...item} />
          ))}
        </div>
        <div className="space-y-1">
          <p className="hidden px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-dim lg:block">
            Insights
          </p>
          {insights.map((item) => (
            <SidebarLink key={item.href} {...item} />
          ))}
        </div>
      </nav>

      {/* Green score footer */}
      <div className={cn("shrink-0 border-t border-line")}>
        <div className="hidden justify-center p-3 md:flex lg:hidden">
          <GreenScoreRing value={84} size={44} strokeWidth={6} animate />
        </div>
        <div className="hidden p-4 lg:block">
          <div className="flex items-center gap-3 rounded-xl bg-white/3 p-3">
            <GreenScoreRing value={84} size={56} strokeWidth={6} animate />
            <div>
              <p className="text-sm font-semibold text-ink">Green Score</p>
              <p className="mt-0.5 text-xs text-accent">84/100 · +7 this month 🌱</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
