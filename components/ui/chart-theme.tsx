/**
 * Shared recharts theme for Green Quant AI.
 * Restrained BI look: real axes, gridlines, INR units, plain tooltips.
 * No gradients, no 3D, no glow.
 */
import * as React from "react";

export const chartColors = {
  brand: "#157347",
  brandStrong: "#0f5a37",
  brandSoft: "#a8d4bd",
  green: "#0fa958",
  amber: "#a16207",
  amberSoft: "#d9a441",
  red: "#b3261e",
  blue: "#1d5fd0",
  gray: "#8a938e",
  lightGray: "#adb5b0",
};

export const axisProps = {
  stroke: chartColors.gray,
  fontSize: 11,
  tickLine: false,
  axisLine: { stroke: "#e3e6e3" },
  tick: { fill: "#8a938e", fontSize: 11 },
} as const;

export const gridProps = {
  stroke: "#eef0ee",
  strokeDasharray: "3 3",
  vertical: false,
} as const;

const TOOLTIP_STYLE: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e3e6e3",
  borderRadius: 8,
  boxShadow: "0 8px 24px rgba(16, 24, 40, 0.1)",
  padding: "8px 12px",
  fontSize: 12,
};

/** Plain tooltip: name + per-series colored rows. */
export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string; dataKey?: string | number }>;
  label?: string | number;
  formatter?: (value: number, name: string) => string;
  labelFormatter?: (label: string | number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      {label !== undefined && (
        <p className="mb-1.5 font-semibold text-[#1a211e]">
          {labelFormatter ? labelFormatter(label) : String(label)}
        </p>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-[#56605a]">
              <span
                className="inline-block h-2 w-2 rounded-sm"
                style={{ backgroundColor: entry.color ?? chartColors.brand }}
              />
              {entry.name}
            </span>
            <span className="font-semibold text-[#1a211e]">
              {typeof entry.value === "number" && formatter
                ? formatter(entry.value, String(entry.name ?? entry.dataKey ?? ""))
                : String(entry.value ?? "")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function formatINRAxis(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
