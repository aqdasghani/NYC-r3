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
