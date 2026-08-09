import {
  ArrowRightLeft,
  Bell,
  Camera,
  CornerDownLeft,
  FileText,
  LayoutDashboard,
  Leaf,
  MessageCircle,
  Package,
  PackageSearch,
  Settings,
  ShoppingCart,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface NavLink {
  name: string;
  path: string;
  icon: LucideIcon;
  badge?: number;
}

export interface NavSection {
  title?: string;
  links?: NavLink[];
  /** Features we haven't built yet — rendered as disabled "coming soon" items. */
  soon?: string[];
}

/** Single source of truth for dashboard navigation (desktop sidebar + mobile drawer). */
export const NAV_SECTIONS: NavSection[] = [
  { title: "Overview", links: [{ name: "Dashboard", path: "/dashboard", icon: LayoutDashboard }] },
  {
    title: "Catalogue & Stock",
    links: [
      { name: "Products", path: "/dashboard/products", icon: PackageSearch },
      { name: "Inventory & Expiry", path: "/dashboard/inventory", icon: Package },
      { name: "Smart Capture", path: "/dashboard/scanner", icon: Camera },
    ],
  },
  { title: "Sales", links: [{ name: "Sales & POS", path: "/dashboard/sales", icon: TrendingUp }] },
  { title: "AI Intelligence", links: [{ name: "AI Action Engine", path: "/dashboard/actions", icon: Zap }] },
  {
    title: "Coming soon",
    soon: ["Purchases", "Suppliers", "Transfers", "Returns", "Reports", "Sustainability", "Alerts", "WhatsApp Hub", "Settings"],
  },
];

export const NAV_FLAT: NavLink[] = NAV_SECTIONS.flatMap((s) => s.links ?? []);

/** Resolve a page title for the header from the current path. */
export function titleForPath(pathname: string): string {
  const match = NAV_FLAT.find((l) => l.path === pathname);
  if (match) return match.name;
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  return "GreenShop AI";
}
