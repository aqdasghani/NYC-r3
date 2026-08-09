"use client";

import * as React from "react";
import { ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";
import { Select } from "./Field";
import { Skeleton } from "./Skeleton";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  /** Provide to make the column sortable. */
  sortValue?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Returns searchable text for one row (name, sku, brand…). */
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  /** Controlled search. If provided, rows are filtered externally. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  rowActions?: (row: T) => React.ReactNode;
  emptyState?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

const ALIGN_CLASS = { left: "text-left", right: "text-right", center: "text-center" } as const;

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  searchText,
  searchPlaceholder = "Search…",
  searchValue,
  onSearchChange,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50],
  selectable = false,
  selectedKeys,
  onSelectionChange,
  rowActions,
  emptyState,
  loading = false,
  className,
}: DataTableProps<T>) {
  const [internalSearch, setInternalSearch] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(pageSize);

  const isSearchControlled = searchValue !== undefined;
  const search = isSearchControlled ? searchValue : internalSearch;
  const handleSearchChange = (v: string) => {
    if (onSearchChange) onSearchChange(v);
    else setInternalSearch(v);
    setPage(1);
  };

  const safeRows = React.useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);

  // Filtering
  const filtered = React.useMemo(() => {
    if (!search.trim() || !searchText) return safeRows;
    const q = search.toLowerCase();
    return safeRows.filter((r) => searchText(r).toLowerCase().includes(q));
  }, [safeRows, search, searchText]);

  // Sorting
  const sorted = React.useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [filtered, sortKey, sortDir, columns]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / size));
  const safePage = Math.min(page, totalPages);
  const pageRows = React.useMemo(
    () => sorted.slice((safePage - 1) * size, safePage * size),
    [sorted, safePage, size]
  );

  const selection = selectedKeys ?? new Set<string>();
  const allSelected = selection.size === filtered.length && filtered.length > 0;
  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) onSelectionChange(new Set());
    else onSelectionChange(new Set(filtered.map(rowKey)));
  };
  const toggleRow = (key: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selection);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  };

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else {
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className={cn("overflow-hidden rounded-lg border border-line bg-surface shadow-card", className)}>
      {(searchText || onSearchChange) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 w-full rounded-md border border-line bg-surface pl-8 pr-3 text-xs text-ink placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
            />
          </div>
          <span className="hidden shrink-0 text-xs text-muted sm:block">
            {sorted.length} {sorted.length === 1 ? "row" : "rows"}
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-elevated">
              {selectable && (
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all rows"
                    className="h-3.5 w-3.5 rounded border-line accent-brand"
                  />
                </th>
              )}
              {columns.map((col) => {
                const sortable = Boolean(col.sortValue);
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    className={cn(
                      "whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted",
                      ALIGN_CLASS[col.align ?? "left"],
                      sortable && "cursor-pointer select-none hover:text-dim",
                      col.headerClassName
                    )}
                    onClick={sortable ? () => toggleSort(col.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {sortable && (
                        isSorted ? (
                          sortDir === "asc" ? (
                            <ChevronUp className="h-3 w-3 text-brand" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-brand" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-50" />
                        )
                      )}
                    </span>
                  </th>
                );
              })}
              {rowActions && (
                <th className="w-12 px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted" />
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: size }).map((_, i) => (
                <tr key={i} className="border-b border-line-subtle">
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} className="px-3 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))
            ) : pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
                  className="px-3 py-2"
                >
                  {emptyState ?? (
                    <EmptyState title="Nothing here" description="No rows match the current filters." />
                  )}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => {
                const key = rowKey(row);
                return (
                  <tr
                    key={key}
                    className={cn(
                      "border-b border-line-subtle transition-colors last:border-b-0",
                      selection.has(key) ? "bg-brand-soft/40" : "hover:bg-subtle/70"
                    )}
                  >
                    {selectable && (
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selection.has(key)}
                          onChange={() => toggleRow(key)}
                          aria-label="Select row"
                          className="h-3.5 w-3.5 rounded border-line accent-brand"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-3 py-2.5 text-sm text-dim",
                          ALIGN_CLASS[col.align ?? "left"],
                          col.className
                        )}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                    {rowActions && (
                      <td className="px-3 py-2.5 text-right">{rowActions(row)}</td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-elevated px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>Rows per page</span>
            <Select
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-7 w-[72px] rounded-md border border-line bg-surface text-xs"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-surface text-dim transition-colors hover:bg-subtle disabled:pointer-events-none disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 text-xs text-muted">
              Page {safePage} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-surface text-dim transition-colors hover:bg-subtle disabled:pointer-events-none disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
