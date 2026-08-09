"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

interface DonutProps {
  data: DonutSlice[];
  centerValue: string;
  centerLabel: string;
  height?: number;
  className?: string;
}

/** Light-theme donut chart with a centered total label. */
export function Donut({ data, centerValue, centerLabel, height = 190, className }: DonutProps) {
  const hasData = data.some((d) => d.value > 0);
  return (
    <div className={className} style={{ height }} data-testid="donut">
      {hasData ? (
        <div className="relative h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="62%"
                outerRadius="86%"
                paddingAngle={2}
                stroke="none"
              >
                {data.map((slice, i) => (
                  <Cell key={`${slice.name}-${i}`} fill={slice.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-xl font-bold text-slate-900">{centerValue}</div>
            <div className="text-[10px] font-medium text-slate-500">{centerLabel}</div>
          </div>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-400">
          No data yet
        </div>
      )}
    </div>
  );
}

/** Compact legend list rendered next to a donut. */
export function DonutLegend({
  data,
  total,
  format = (n: number) => n.toLocaleString("en-IN"),
}: {
  data: DonutSlice[];
  total: number;
  format?: (n: number) => string;
}) {
  if (!data.length) return null;
  return (
    <ul className="space-y-2">
      {data.map((slice) => {
        const pct = total > 0 ? ((slice.value / total) * 100).toFixed(1) : "0.0";
        return (
          <li key={slice.name} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
              <span className="truncate font-medium text-slate-600">{slice.name}</span>
            </div>
            <div className="shrink-0 font-semibold text-slate-900">
              {format(slice.value)}
              <span className="ml-1 font-normal text-slate-400">({pct}%)</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
