"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import { Download, RefreshCcw, ScanBarcode, Plus, Minus, CreditCard, X } from "lucide-react";
import { getBatches, getProducts, getTransactions, postSale } from "@/lib/api";
import { subscribeLive } from "@/lib/live";
import type { BatchOut, ProductOut, Receipt } from "@/lib/backend-types";
import { formatINR } from "@/lib/utils";

interface CatalogueItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  barcode: string | null;
}

interface CartLine {
  product: CatalogueItem;
  quantity: number;
}

export default function SalesPage() {
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [txns, setTxns] = useState<{ id: string; time: string; items: number; total: number; status: string }[]>([]);
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [products, batches, rows] = await Promise.all([
      getProducts(),
      getBatches(),
      getTransactions(),
    ]);
    // Aggregate live stock per product from batches (FEFO), then merge with catalogue.
    const stockByProduct = new Map<string, number>();
    for (const b of batches) {
      stockByProduct.set(b.product_id, (stockByProduct.get(b.product_id) ?? 0) + b.quantity);
    }
    const items: CatalogueItem[] = products.map((p: ProductOut) => ({
      id: p.id,
      name: p.name,
      category: p.category ?? "General",
      price: p.selling_price ?? p.purchase_price ?? 0,
      stock: stockByProduct.get(p.id) ?? 0,
      barcode: p.barcode ?? null,
    }));
    setCatalogue(items);
    setTxns(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const unsub = subscribeLive((event) => {
      if (event.type === "inventory_updated") void load();
    });
    return unsub;
  }, [load]);

  const addToCart = (product: CatalogueItem) => {
    if (product.stock <= 0) {
      setNotice(`Out of stock — ${product.name}`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setNotice(null);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.product.id !== productId) return l;
          const next = l.quantity + delta;
          if (next > l.product.stock) return l;
          return { ...l, quantity: Math.max(0, next) };
        })
        .filter((l) => l.quantity > 0)
    );
  };

  const applyBarcode = () => {
    const q = barcode.trim().toLowerCase();
    if (!q) return;
    const hit = catalogue.find(
      (p) => p.barcode?.toLowerCase() === q || p.name.toLowerCase().includes(q)
    );
    if (hit) addToCart(hit);
    else setNotice(`No product found for "${barcode}"`);
    setBarcode("");
  };

  const cartTotal = useMemo(
    () => cart.reduce((sum, l) => sum + l.product.price * l.quantity, 0),
    [cart]
  );

  const handleCheckout = async () => {
    if (cart.length === 0 || placing) return;
    setPlacing(true);
    setNotice(null);
    try {
      const payload = cart.map((l) => ({ product_id: l.product.id, quantity: l.quantity }));
      const response = await postSale(payload);
      setReceipt(response.receipt);
      const total = response.receipt.grand_total;
      setTxns((prev) => [
        {
          id: response.receipt.receipt_no,
          time: response.receipt.timestamp,
          items: cart.reduce((sum, l) => sum + l.quantity, 0),
          total,
          status: "COMPLETED",
        },
        ...prev,
      ]);
      setCart([]);
      void load(); // refresh stock after sale
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Point of Sale</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            FEFO allocation on checkout — oldest batches are sold first.
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btnAction} onClick={() => void load()}>
            <RefreshCcw size={14} style={{ marginRight: 6 }} /> Sync
          </button>
          <button className={styles.btnAction} onClick={() => setNotice("Z-report export coming soon.")}>
            <Download size={14} style={{ marginRight: 6 }} /> Export Z-Report
          </button>
        </div>
      </div>

      {notice && (
        <div
          style={{
            background: "var(--brand-green-light)",
            border: "1px solid var(--brand-green)",
            color: "var(--brand-green-dark)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
          }}
        >
          {notice}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: 24, alignItems: "start" }}>
        {/* Left: catalogue */}
        <div className={styles.card} style={{ display: "flex", flexDirection: "column", minHeight: 400 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 className={styles.cardTitle} style={{ marginBottom: 0, border: "none", padding: 0 }}>
              Quick Add
            </h3>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyBarcode()}
                placeholder="Scan Barcode / search…"
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-full)",
                  border: "1px solid var(--border-default)",
                  outline: "none",
                  width: 220,
                  fontSize: 13,
                }}
              />
              <button className={styles.btnAction} style={{ borderColor: "var(--brand-blue)", color: "var(--brand-blue)" }} onClick={applyBarcode}>
                <ScanBarcode size={14} />
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>Loading catalogue…</div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 12,
                maxHeight: 520,
                overflowY: "auto",
              }}
            >
              {catalogue.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={p.stock <= 0}
                  style={{
                    textAlign: "left",
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid var(--border-default)",
                    background: p.stock <= 0 ? "var(--bg-app)" : "var(--bg-surface)",
                    cursor: p.stock <= 0 ? "not-allowed" : "pointer",
                    opacity: p.stock <= 0 ? 0.5 : 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{p.category}</span>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 800, color: "var(--brand-green-dark)" }}>{formatINR(p.price)}</span>
                    <span style={{ fontSize: 11, color: p.stock > 10 ? "var(--brand-green)" : "var(--brand-orange)", fontWeight: 600 }}>
                      {p.stock} left
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: cart */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Current Sale</h3>
          {cart.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: 13, padding: "16px 0" }}>
              Tap a product or scan a barcode to add items.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, overflowY: "auto" }}>
              {cart.map((l) => (
                <div key={l.product.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {l.product.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                      {formatINR(l.product.price)} × {l.quantity}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button className={styles.btnAction} style={{ padding: "4px 8px" }} onClick={() => updateQuantity(l.product.id, -1)}>
                      <Minus size={12} />
                    </button>
                    <span style={{ fontWeight: 700, width: 24, textAlign: "center" }}>{l.quantity}</span>
                    <button className={styles.btnAction} style={{ padding: "4px 8px" }} onClick={() => updateQuantity(l.product.id, 1)}>
                      <Plus size={12} />
                    </button>
                    <button
                      className={styles.btnAction}
                      style={{ padding: "4px 8px", color: "var(--critical, #EF4444)" }}
                      onClick={() => updateQuantity(l.product.id, -l.quantity)}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-light)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>
              <span>Subtotal</span>
              <span>{formatINR(cartTotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
              <span>GST</span>
              <span>Included in prices</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 12 }}>
              <span>Total</span>
              <span>{formatINR(cartTotal)}</span>
            </div>
            <button className={`${styles.btnAction} ${styles.btnPrimary}`} onClick={handleCheckout} disabled={cart.length === 0 || placing} style={{ width: "100%", padding: "12px", display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
              <CreditCard size={16} /> {placing ? "Processing…" : "Charge " + formatINR(cartTotal)}
            </button>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Receipt</th>
              <th>Time</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {txns.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--text-secondary)", padding: 24 }}>
                  No transactions yet.
                </td>
              </tr>
            )}
            {txns.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 700 }}>#{t.id}</td>
                <td>{new Date(t.time).toLocaleString("en-IN", { hour12: false })}</td>
                <td>{t.items}</td>
                <td style={{ fontWeight: 700 }}>{formatINR(t.total)}</td>
                <td>
                  <span style={{ color: "var(--brand-green)", fontWeight: 600, fontSize: 12 }}>● COMPLETED</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Receipt modal */}
      {receipt && (
        <div
          onClick={() => setReceipt(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 24, width: 360, maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontWeight: 800, fontSize: 16 }}>Receipt #{receipt.receipt_no}</h3>
              <button onClick={() => setReceipt(null)} style={{ border: "none", background: "none", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
              {new Date(receipt.timestamp).toLocaleString("en-IN")}
            </div>
            <div style={{ borderTop: "1px dashed #CBD5E1", paddingTop: 8 }}>
              {receipt.lines.map((line, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                  <span style={{ color: "var(--text-primary)" }}>{line.name} × {line.qty}</span>
                  <span style={{ fontWeight: 600 }}>{formatINR(line.line_total)}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: "1px dashed #CBD5E1", marginTop: 8, paddingTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                <span>Subtotal</span><span>{formatINR(receipt.subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                <span>GST</span><span>{formatINR(receipt.gst_total)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800, color: "var(--brand-green-dark)" }}>
                <span>Grand Total</span><span>{formatINR(receipt.grand_total)}</span>
              </div>
            </div>
            <button className={`${styles.btnAction} ${styles.btnPrimary}`} style={{ width: "100%", marginTop: 16, padding: 10 }} onClick={() => setReceipt(null)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
