"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import { useSidebar } from "./SidebarContext";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/pos": "Point of Sale",
  "/dashboard/products": "Products",
  "/dashboard/inventory": "Inventory",
  "/dashboard/sales": "Sales & Performance",
  "/dashboard/procurement": "Procurement",
  "/dashboard/suppliers": "Suppliers",
  "/dashboard/transfers": "Stock Transfers",
  "/dashboard/returns": "Returns",
  "/dashboard/scanner": "Smart Receiving",
  "/dashboard/briefing": "Daily Briefing",
  "/dashboard/intelligence": "Intelligence",
  "/dashboard/intelligence/copilot": "Retail Copilot",
  "/dashboard/intelligence/heatmap": "Peak Hour Heatmap",
  "/dashboard/reports": "Reports",
  "/dashboard/sustainability": "Sustainability",
  "/dashboard/alerts": "Alerts",
  "/dashboard/actions": "Action Engine",
  "/dashboard/whatsapp": "WhatsApp Hub",
  "/dashboard/settings": "Settings",
};

function formatToday() {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());
}

export function TopHeader() {
  const { toggle } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("Rahul Kumar");
  const [userInitials, setUserInitials] = useState("RK");
  const [storeName, setStoreName] = useState("GreenMart - MG Road");
  const [role, setRole] = useState("Owner");
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      const authData = localStorage.getItem("Green Quant_auth");
      if (authData) {
        const parsed = JSON.parse(authData);
        if (parsed?.user) {
          const name = parsed.user.name || "Store Owner";
          setUserName(name);
          const parts = name.split(" ");
          let initials = parts[0][0]?.toUpperCase() || "O";
          if (parts.length > 1) initials += parts[1][0]?.toUpperCase() || "";
          setUserInitials(initials);
          setStoreName(parsed.user.store_name || "GreenShop");
          const rawRole = parsed.user.role || "OWNER";
          setRole(rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase());
        }
      }
    } catch (e) {
      console.error("Failed to parse auth data", e);
    }
  }, []);

  const title = TITLES[pathname] ?? "Dashboard";
  const today = formatToday();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-3 md:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={toggle}
          className="rounded-md p-2 text-dim transition-colors hover:bg-subtle hover:text-ink"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-[15px] font-semibold tracking-tight text-ink">{title}</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative hidden w-56 lg:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && search.trim()) {
                router.push(`/dashboard/products?search=${encodeURIComponent(search.trim())}`);
                setSearch("");
              }
            }}
            placeholder="Search products…"
            aria-label="Search products"
            className="h-8 w-full rounded-md border border-line bg-elevated pl-8 pr-3 text-xs text-ink placeholder:text-faint transition-colors focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/20 focus:outline-none"
          />
        </div>

        <div className="hidden items-center gap-2 rounded-md border border-line bg-elevated px-2.5 py-1.5 md:flex">
          <span className="max-w-[140px] truncate text-xs font-medium text-dim">{storeName}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted" />
        </div>

        <span className="hidden text-xs font-medium text-muted lg:block">{today}</span>

        <Link
          href="/dashboard/alerts"
          className="relative rounded-md p-2 text-dim transition-colors hover:bg-subtle hover:text-ink"
          aria-label="Open alerts"
        >
          <Bell className="h-[18px] w-[18px]" />
        </Link>

        <div className="flex items-center gap-2.5 border-l border-line pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
            {userInitials}
          </div>
          <div className="hidden text-left md:block">
            <div className="text-xs font-semibold leading-tight text-ink">{userName}</div>
            <div className="text-[11px] font-medium leading-tight text-muted">{role}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
