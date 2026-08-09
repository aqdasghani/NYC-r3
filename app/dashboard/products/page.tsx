"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PackageSearch, Plus, Search, RefreshCw, X, CheckCircle2 } from "lucide-react";
import { createProduct, getBatches, getCategories, getProducts } from "@/lib/api";
import { subscribeLive } from "@/lib/live";
import { formatINR } from "@/lib/utils";
import type { ProductOut } from "@/lib/backend-types";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { LoadingBlock } from "@/components/dashboard/LoadingBlock";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { StatCard } from "@/components/dashboard/StatCard";

const EMPTY_FORM = {
  name: "",
  sku: "",
  barcode: "",
  category: "",
  purchase_price: "",
  selling_price: "",
  gst_rate: "",
  lead_time_days: "0",
};

function ProductForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createProduct({
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        barcode: form.barcode.trim() || undefined,
        category: form.category.trim() || undefined,
        purchase_price: form.purchase_price ? Number(form.purchase_price) : undefined,
        selling_price: form.selling_price ? Number(form.selling_price) : undefined,
        gst_rate: form.gst_rate ? Number(form.gst_rate) : undefined,
        lead_time_days: form.lead_time_days ? Number(form.lead_time_days) : 0,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save product");
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Add Product" subtitle="A new catalogue entry. Batches can be added via Smart Capture.">
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="sm:col-span-2 lg:col-span-3">
          <span className="text-xs font-semibold text-slate-600">Product name *</span>
          <input value={form.name} onChange={set("name")} placeholder="e.g. Amul Butter 500g" className="input-field" />
        </label>
        <label>
          <span className="text-xs font-semibold text-slate-600">SKU</span>
          <input value={form.sku} onChange={set("sku")} placeholder="AM-BUT-500" className="input-field" />
        </label>
        <label>
          <span className="text-xs font-semibold text-slate-600">Barcode</span>
          <input value={form.barcode} onChange={set("barcode")} placeholder="8901…" className="input-field" />
        </label>
        <label>
          <span className="text-xs font-semibold text-slate-600">Category</span>
          <input value={form.category} onChange={set("category")} placeholder="Dairy" className="input-field" />
        </label>
        <label>
          <span className="text-xs font-semibold text-slate-600">Purchase price (₹)</span>
          <input value={form.purchase_price} onChange={set("purchase_price")} type="number" min="0" placeholder="0" className="input-field" />
        </label>
        <label>
          <span className="text-xs font-semibold text-slate-600">Selling price (₹)</span>
          <input value={form.selling_price} onChange={set("selling_price")} type="number" min="0" placeholder="0" className="input-field" />
        </label>
        <label>
          <span className="text-xs font-semibold text-slate-600">GST rate (%)</span>
          <input value={form.gst_rate} onChange={set("gst_rate")} type="number" min="0" max="100" placeholder="12" className="input-field" />
        </label>
        <label>
          <span className="text-xs font-semibold text-slate-600">Lead time (days)</span>
          <input value={form.lead_time_days} onChange={set("lead_time_days")} type="number" min="0" placeholder="0" className="input-field" />
        </label>

        {error && <p className="text-xs font-medium text-red-600 sm:col-span-2 lg:col-span-3">{error}</p>}

        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0c8a49] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Product"}
          </button>
          <button type="button" onClick={onDone} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [stock, setStock] = useState<Map<string, number>>(new Map());
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [items, batches, cats] = await Promise.all([getProducts(), getBatches(), getCategories()]);
    const stockByProduct = new Map<string, number>();
    for (const b of batches) {
      stockByProduct.set(b.product_id, (stockByProduct.get(b.product_id) ?? 0) + b.quantity);
    }
    setStock(stockByProduct);
    setProducts(items);
    setCategories(cats);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const unsub = subscribeLive((event) => {
      if (event.type === "inventory_updated") void load();
    });
    return unsub;
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesQuery = !q || p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q) || (p.barcode ?? "").includes(q);
      const matchesCat = category === "all" || p.category === category;
      return matchesQuery && matchesCat;
    });
  }, [products, query, category]);

  const lowStock = products.filter((p) => (stock.get(p.id) ?? 0) <= 0).length;
  const value = products.reduce((sum, p) => sum + (p.selling_price ?? p.purchase_price ?? 0) * (stock.get(p.id) ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Products" subtitle="Your catalogue — live stock is aggregated from FEFO batches.">
        <button
          onClick={() => {
            setShowForm((v) => !v);
            setNotice(null);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0c8a49]"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Close" : "Add Product"}
        </button>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> Sync
        </button>
      </PageHeader>

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> {notice}
        </div>
      )}

      {showForm && (
        <ProductForm
          onDone={() => {
            setShowForm(false);
            setNotice("Product added to your catalogue.");
            void load();
          }}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Products" value={products.length} icon={PackageSearch} accent="green" />
        <StatCard label="Catalogue Value" value={value} money="compact" icon={PackageSearch} accent="blue" />
        <StatCard label="Out of Stock" value={lowStock} sub="No live batches" icon={PackageSearch} accent="amber" />
      </div>

      {loading ? (
        <LoadingBlock className="h-72" />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, SKU or barcode…"
                className="input-field w-full pl-9"
              />
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field sm:w-52">
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="No products found"
              description="Try a different search, or add your first product to start building the catalogue."
              action={
                <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c8a49]">
                  <Plus className="h-4 w-4" /> Add Product
                </button>
              }
            />
          ) : (
            <SectionCard>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                      <th className="px-3 py-2.5 font-semibold">Product</th>
                      <th className="px-3 py-2.5 font-semibold">Category</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Selling price</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Margin</th>
                      <th className="px-3 py-2.5 text-right font-semibold">In stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const qty = stock.get(p.id) ?? 0;
                      const margin = p.purchase_price && p.selling_price ? p.selling_price - p.purchase_price : null;
                      const marginPct = margin && p.purchase_price ? Math.round((margin / p.purchase_price) * 100) : null;
                      return (
                        <tr key={p.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/60">
                          <td className="px-3 py-3">
                            <div className="font-bold text-slate-800">{p.name}</div>
                            <div className="text-xs text-slate-400">{p.sku ?? p.barcode ?? "—"}</div>
                          </td>
                          <td className="px-3 py-3 text-slate-600">{p.category ?? "—"}</td>
                          <td className="px-3 py-3 text-right font-bold text-slate-800">{p.selling_price ? formatINR(p.selling_price) : "—"}</td>
                          <td className="px-3 py-3 text-right">
                            {marginPct !== null ? (
                              <span className={marginPct >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-red-500"}>{marginPct}%</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className={qty > 0 ? "font-semibold text-slate-800" : "font-semibold text-red-500"}>
                              {qty} {qty > 0 ? "units" : "— out"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="divide-y divide-slate-100 md:hidden">
                {filtered.map((p) => {
                  const qty = stock.get(p.id) ?? 0;
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-400">
                          {p.category ?? "General"} · {p.sku ?? p.barcode ?? "no SKU"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-slate-800">{p.selling_price ? formatINR(p.selling_price) : "—"}</p>
                        <p className={`text-xs ${qty > 0 ? "text-emerald-600" : "text-red-500"}`}>{qty > 0 ? `${qty} in stock` : "Out of stock"}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
