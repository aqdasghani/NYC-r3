"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarLinkProps {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

/**
 * Nav link. Full-width with label on desktop (lg+), icon-only 44px square
 * on tablet (md–lg) — handled purely via CSS so there's no hydration flip.
 * Active state animates as a shared spring "pill".
 */
export function SidebarLink({ href, label, icon: Icon, badge }: SidebarLinkProps) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      title={label}
      className="focus-ring relative block w-11 lg:w-full"
    >
      {active && (
        <motion.span
          layoutId="nav-pill"
          className="absolute inset-0 rounded-xl border-l-2 border-accent bg-accent/10"
          transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
        />
      )}
      <span
        className={cn(
          "relative flex h-11 items-center justify-center gap-3 text-sm font-medium transition-colors lg:h-auto lg:justify-start lg:px-3 lg:py-2.5",
          active ? "text-ink" : "text-muted hover:text-ink"
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="hidden flex-1 truncate lg:inline">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="hidden h-5 min-w-5 items-center justify-center rounded-full bg-critical px-1.5 text-[10px] font-bold text-white lg:flex">
            {badge}
          </span>
        )}
        {badge !== undefined && badge > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-critical lg:hidden" />
        )}
      </span>
    </Link>
  );
}
