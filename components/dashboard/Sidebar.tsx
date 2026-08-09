"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, PackageSearch, Package, TrendingUp,
  ClipboardList, Users, ArrowRightLeft, CornerDownLeft, ScanBarcode,
  Zap, Lightbulb, FileText, Leaf, Bell, MessageCircle, Settings, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarContext";

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { name: "POS", path: "/dashboard/pos", icon: ShoppingCart },
      { name: "Products", path: "/dashboard/products", icon: PackageSearch },
      { name: "Inventory", path: "/dashboard/inventory", icon: Package },
      { name: "Sales", path: "/dashboard/sales", icon: TrendingUp },
      { name: "Procurement", path: "/dashboard/procurement", icon: ClipboardList },
      { name: "Suppliers", path: "/dashboard/suppliers", icon: Users },
      { name: "Transfers", path: "/dashboard/transfers", icon: ArrowRightLeft },
      { name: "Returns", path: "/dashboard/returns", icon: CornerDownLeft },
      { name: "Scanner", path: "/dashboard/scanner", icon: ScanBarcode },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { name: "Daily Briefing", path: "/dashboard/briefing", icon: Zap },
      { name: "Intelligence", path: "/dashboard/intelligence", icon: Lightbulb },
      { name: "Reports", path: "/dashboard/reports", icon: FileText },
      { name: "Sustainability", path: "/dashboard/sustainability", icon: Leaf },
      { name: "Alerts", path: "/dashboard/alerts", icon: Bell },
    ],
  },
  {
    label: "Management",
    items: [
      { name: "WhatsApp Hub", path: "/dashboard/whatsapp", icon: MessageCircle },
      { name: "Settings", path: "/dashboard/settings", icon: Settings },
    ],
  },
];

function isActivePath(pathname: string, path: string) {
  if (path === "/dashboard") return pathname === path;
  return pathname === path || pathname.startsWith(path + "/");
}

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();
  const [scoreData, setScoreData] = React.useState<{ score: number; delta: number } | null>(null);
  const [alertCount, setAlertCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    import("@/lib/api").then(({ getGreenScore, getAtRisk }) =>
      Promise.all([
        getGreenScore().catch(() => null),
        getAtRisk().catch(() => null),
      ])
    ).then(([score, atRisk]) => {
      if (score) setScoreData({ score: score.score, delta: score.delta });
      if (Array.isArray(atRisk)) setAlertCount(atRisk.length);
    }).catch(console.error);
  }, []);

  const currentScore = scoreData?.score ?? 0;
  const delta = scoreData?.delta ?? 0;

  return (
    <>
      {!collapsed && (
        <div className="fixed inset-0 bg-[#0f1512]/40 z-30 md:hidden" onClick={toggle} />
      )}
      <motion.aside
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="fixed z-40 flex h-screen flex-shrink-0 flex-col border-r border-line bg-sidebar md:relative md:z-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Logo */}
        <div className={cn("flex flex-col pt-5 pb-4", collapsed ? "items-center px-3" : "px-4")}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand">
              <Leaf className="h-[18px] w-[18px] text-white" />
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.16 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <span className="block text-[15px] font-semibold tracking-tight text-ink">
                    Green Quant AI
                  </span>
                  <span className="block text-[10px] font-medium text-muted">
                    Smart Retail. Zero Waste.
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-2 pb-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-faint"
                  >
                    {group.label}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActivePath(pathname, item.path);
                  // Alerts badge shows the real at-risk count (0/hidden while unloaded).
                  const badge = item.path === "/dashboard/alerts" ? (alertCount ?? 0) : (item.badge ?? 0);
                  return (
                    <Link key={item.path} href={item.path} title={collapsed ? item.name : undefined}>
                      <div
                        className={cn(
                          "flex items-center rounded-md text-sm transition-colors duration-150",
                          collapsed ? "justify-center px-2 py-2" : "justify-between gap-2 px-2.5 py-2",
                          active ? "bg-brand-soft text-brand-strong font-medium" : "text-dim hover:bg-subtle hover:text-ink"
                        )}
                      >
                        <span className={cn("flex items-center", collapsed ? "" : "gap-2.5 min-w-0")}>
                          <item.icon
                            className={cn("h-4 w-4 shrink-0", active ? "text-brand" : "text-muted")}
                          />
                          <AnimatePresence initial={false}>
                            {!collapsed && (
                              <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.16 }}
                                className="overflow-hidden whitespace-nowrap"
                              >
                                {item.name}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </span>
                        {!collapsed && badge > 0 && (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                            {badge}
                          </span>
                        )}
                        {!collapsed && badge === 0 && (
                          <ChevronRight
                            className={cn("h-3.5 w-3.5 shrink-0 transition-opacity", active ? "text-brand/60" : "text-faint opacity-0 group-hover:opacity-100")}
                          />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Green Score */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="mx-3 mb-4"
            >
              <div className="rounded-lg border border-line bg-surface p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">Green Score</span>
                  <span className="text-xs font-semibold text-brand">
                    {currentScore > 0 ? `${currentScore}/100` : "Building..."}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-subtle">
                  <div
                    className="h-full rounded-full bg-brand transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, currentScore))}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted">
                  {currentScore > 0
                    ? `${delta >= 0 ? "+" : ""}${delta} this month · store index`
                    : "Accumulating store data"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>
    </>
  );
}
