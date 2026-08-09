"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingCart,
  ScanLine,
  Package,
  Boxes,
  TrendingUp,
  ClipboardList,
  Truck,
  ArrowLeftRight,
  Undo2,
  Sparkles,
  BarChart2,
  Settings,
  Leaf
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GreenScoreRing } from "@/components/ui/GreenScoreRing";
import { SidebarLink } from "./SidebarLink";
import type { Module } from "@/lib/auth";
import { hasPermission } from "@/lib/auth";
import { getCurrentUser } from "@/lib/api-client";

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { href: '/dashboard/pos', label: 'POS', icon: ShoppingCart, module: 'pos' },
  { href: '/dashboard/scanner', label: 'Scanner', icon: ScanLine, module: 'scanner' },
  { href: '/dashboard/products', label: 'Products', icon: Package, module: 'products' },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Boxes, module: 'inventory' },
  { href: '/dashboard/sales', label: 'Sales', icon: TrendingUp, module: 'sales' },
  { href: '/dashboard/procurement', label: 'Procurement', icon: ClipboardList, module: 'procurement' },
  { href: '/dashboard/suppliers', label: 'Suppliers', icon: Truck, module: 'suppliers' },
  { href: '/dashboard/transfers', label: 'Transfers', icon: ArrowLeftRight, module: 'transfers' },
  { href: '/dashboard/returns', label: 'Returns', icon: Undo2, module: 'returns' },
  { href: '/dashboard/actions', label: 'AI Actions', icon: Sparkles, module: 'ai' },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart2, module: 'reports' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, module: 'settings' },
];

function getCurrentRole(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem('Green Quant_auth');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return parsed?.user?.role;
  } catch { return undefined; }
}

export function Sidebar() {
  const [role, setRole] = useState<string | undefined>(undefined);
  const [userName, setUserName] = useState<string | undefined>(undefined);

  useEffect(() => {
    const userRole = getCurrentRole();
    setRole(userRole);
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('Green Quant_auth');
        if (raw) {
          const parsed = JSON.parse(raw);
          setUserName(parsed?.user?.name);
        }
      } catch (e) {}
    }
  }, []);

  const visibleItems = NAV_ITEMS.filter((item) => hasPermission(role, item.module as Module));

  const roleColors: Record<string, string> = {
    OWNER: 'bg-purple-100 text-purple-700',
    MANAGER: 'bg-blue-100 text-blue-700',
    BILLER: 'bg-green-100 text-green-700',
    WORKER: 'bg-yellow-100 text-yellow-700',
    BILL: 'bg-yellow-100 text-yellow-700',
  };
  const roleStyle = role ? roleColors[role] || 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-700';


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
            Menu
          </p>
          {visibleItems.map((item) => (
            <SidebarLink key={item.href} {...item} />
          ))}
        </div>
      </nav>

      {/* Green score footer */}
      <div className={cn("shrink-0 border-t border-line")}>
        <div className="hidden justify-center p-3 md:flex lg:hidden">
          <GreenScoreRing value={84} size={44} strokeWidth={6} animate />
        </div>
        <div className="hidden p-4 lg:block space-y-3">
          {userName && role && (
            <div className="flex items-center gap-3 rounded-xl bg-white/3 p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{userName}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${roleStyle}`}>
                  {role}
                </span>
              </div>
            </div>
          )}
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
