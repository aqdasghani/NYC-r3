import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export const PRIORITY_META = {
  URGENT: { border: "border-l-red-500", chipBg: "bg-red-500/10", chipText: "text-red-500", label: "URGENT" },
  ACTION: { border: "border-l-orange-500", chipBg: "bg-orange-500/10", chipText: "text-orange-500", label: "ACTION NEEDED" },
  REORDER: { border: "border-l-blue-500", chipBg: "bg-blue-500/10", chipText: "text-blue-500", label: "REORDER" },
  TRANSFER: { border: "border-l-green-500", chipBg: "bg-green-500/10", chipText: "text-green-500", label: "TRANSFER" },
};

export const STATUS_META = {
  CRITICAL: { border: "border-red-200", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", pulse: true, label: "Critical" },
  WARNING: { border: "border-orange-200", bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", pulse: false, label: "Warning" },
  UPCOMING: { border: "border-blue-200", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", pulse: false, label: "Upcoming" },
  SAFE: { border: "border-green-200", bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500", pulse: false, label: "Safe" },
  DEAD_STOCK: { border: "border-gray-200", bg: "bg-gray-50", text: "text-gray-700", dot: "bg-gray-500", pulse: false, label: "Dead Stock" },
  OVERSTOCK: { border: "border-purple-200", bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500", pulse: false, label: "Overstock" },
};

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

