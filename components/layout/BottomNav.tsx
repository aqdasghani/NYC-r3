"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Boxes, Home, Leaf, ScanLine, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/receiving", label: "Receive", icon: ScanLine },
  { href: "/actions", label: "AI", icon: Zap },
  { href: "/green-score", label: "Score", icon: Leaf },
];

/** Mobile bottom tab bar (< md). Shared pill slides between active tabs. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-sidebar/85 pb-safe backdrop-blur-xl md:hidden">
      <div className="flex items-stretch justify-around">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center gap-1 pb-1.5 pt-2.5"
            >
              {active && (
                <motion.span
                  layoutId="bottom-pill"
                  className="absolute top-0 h-0.5 w-10 rounded-full bg-accent"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <Icon className={cn("h-5 w-5", active ? "text-accent" : "text-dim")} />
              <span className={cn("text-[10px] font-medium", active ? "text-accent" : "text-dim")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
