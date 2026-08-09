"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf } from "lucide-react";
import { NAV_SECTIONS, type NavLink } from "./NavItems";
import { GreenScoreWidget } from "./GreenScoreWidget";

interface SidebarProps {
  /** Mobile drawer open state (desktop sidebar is always visible). */
  open?: boolean;
  onClose?: () => void;
}

function NavLinkRow({ link, active }: { link: NavLink; active: boolean }) {
  return (
    <Link href={link.path} className="block">
      <div
        className={`group flex items-center justify-between rounded-lg px-3 py-2.5 transition-all duration-200 ${
          active ? "bg-[#0FA958]" : "hover:bg-white/5"
        }`}
      >
        <div className="flex items-center gap-3">
          <link.icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-400 group-hover:text-white"}`} />
          <span className={`text-sm font-medium ${active ? "text-white" : "text-slate-300 group-hover:text-white"}`}>{link.name}</span>
        </div>
        {link.badge ? (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{link.badge}</div>
        ) : (
          <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white/80" : "bg-transparent"}`} />
        )}
      </div>
    </Link>
  );
}

/** Shared sidebar content: logo, sectioned nav, green-score widget, footer. */
function SidebarInner({ onDismiss }: { onDismiss?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <div className="mb-6 px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0FA958] shadow-[0_0_15px_rgba(15,169,88,0.5)]">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">GreenShop AI</span>
        </div>
        <span className="ml-10 text-[10px] font-medium text-[#0FA958]">Smart Retail. Zero Waste.</span>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3" style={{ scrollbarWidth: "none" }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.title ?? "links"}>
            {section.title && (
              <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{section.title}</div>
            )}
            <div className="space-y-1">
              {section.links?.map((link) => (
                <NavLinkRow key={link.path} link={link} active={pathname === link.path} />
              ))}
              {section.soon?.map((name) => (
                <div key={name} className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2.5 opacity-50">
                  <span className="text-sm font-medium text-slate-300">{name}</span>
                  <span className="rounded border border-slate-600 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400">Soon</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-6 px-4">
        <GreenScoreWidget onDismiss={onDismiss} />
      </div>
      <div className="px-5 pb-2 pt-4 text-[10px] text-slate-600">GreenShop AI · v0.1.0</div>
    </>
  );
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop — always visible ≥ lg */}
      <aside className="hidden h-screen w-[260px] shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-[#0A412A] bg-[#063120] pt-6 lg:flex" style={{ scrollbarWidth: "none" }}>
        <SidebarInner />
      </aside>

      {/* Mobile drawer — slides in over content */}
      <div className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={onClose}
        />
        <div
          className={`absolute left-0 top-0 flex h-full w-[280px] flex-col overflow-y-auto bg-[#063120] pt-6 shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}
          style={{ scrollbarWidth: "none" }}
        >
          <SidebarInner onDismiss={onClose} />
        </div>
      </div>
    </>
  );
}
