"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { getProducts, postSale } from "@/lib/api";
import type { ProductOut, Receipt } from "@/lib/backend-types";
import { Search, Plus, Minus, Trash2, Printer, CheckCircle, Wallet, CreditCard, Smartphone, X } from "lucide-react";
import { Button, Card, Input, Modal } from "@/components/ui";
import { formatINR } from "@/lib/utils";

type CartItem = {
  product: ProductOut;
  quantity: number;
  discountPct: number;
};

export default function PosPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductOut[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CARD">("CASH");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<any | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    import("@/lib/api-client").then(({ apiFetch }) => {
      apiFetch<any>("/api/stores/current")
        .then(s => setStore(s))
        .catch(() => null);
    });
  }, []);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await getProducts(searchQuery);
        setSearchResults(results.slice(0, 5));
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery]);

  function addToCart(product: ProductOut) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { product, quantity: 1, discountPct: 0 }];
    });
    setSearchQuery("");
    setSearchResults([]);
    searchInputRef.current?.focus();
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) => prev.map((i) => (i.product.id === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)).filter((i) => i.quantity > 0));
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  function updateDiscount(productId: string, pct: number) {
    setCart((prev) => prev.map((i) => (i.product.id === productId ? { ...i, discountPct: Math.min(100, Math.max(0, pct)) } : i)));
  }

  const cartTotals = useMemo(() => {
    let subtotal = 0,
      discount = 0,
      gst = 0;
    for (const item of cart) {
      const basePrice = (item.product.selling_price || 0) * item.quantity;
      const discAmt = basePrice * (item.discountPct / 100);
      const afterDisc = basePrice - discAmt;
      const gstAmt = afterDisc * ((item.product.gst_rate || 0) / 100);
      subtotal += basePrice;
      discount += discAmt;
      gst += gstAmt;
    }
    return { subtotal, discount, gst, total: subtotal - discount + gst };
  }, [cart]);

  async function handleCheckout() {
    if (cart.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const items = cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity }));
      const response = await postSale(items);
      setReceipt(response.receipt);
      setCart([]);
    } catch (err: any) {
      setError(err.message || "Sale failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const paymentOptions = [
    { mode: "CASH" as const, icon: <Wallet className="w-4 h-4" />, label: "Cash" },
    { mode: "UPI" as const, icon: <Smartphone className="w-4 h-4" />, label: "UPI" },
    { mode: "CARD" as const, icon: <CreditCard className="w-4 h-4" />, label: "Card" },
  ];

  return (
    <div className="flex flex-col h-full bg-canvas relative overflow-hidden">
      <div className="max-w-lg w-full mx-auto flex flex-col h-full bg-surface shadow-popover lg:rounded-xl lg:my-6 lg:h-[calc(100vh-3rem)] border border-line">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-line shrink-0">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink">POS — Billing</h1>
            <p className="text-sm text-muted">Session: 001</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-brand" />
          </div>
        </div>

        {/* Search */}
        <div className="p-4 shrink-0 relative z-20">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              ref={searchInputRef}
              type="text"
              className="h-12 pl-12 pr-4 bg-subtle border border-line rounded-xl text-lg focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="Search product or scan barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {/* Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-4 right-4 mt-2 bg-surface rounded-xl shadow-popover border border-line overflow-hidden z-30">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  className="w-full text-left px-4 py-3 hover:bg-subtle border-b border-line-subtle last:border-0 flex justify-between items-center transition-colors"
                  onClick={() => addToCart(p)}
                >
                  <div>
                    <div className="font-medium text-ink">{p.name}</div>
                    <div className="text-xs text-muted">{p.barcode || "No barcode"}</div>
                  </div>
                  <div className="font-bold text-brand">{formatINR(p.selling_price || 0)}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 pb-2 shrink-0">
            <div className="bg-danger-soft border border-danger/30 text-danger px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          </div>
        )}

        {/* Cart */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 z-10">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted space-y-2">
              <div className="w-16 h-16 rounded-full bg-subtle flex items-center justify-center">
                <Search className="h-8 w-8 text-muted/50" />
              </div>
              <p className="font-medium text-lg text-ink">Cart is empty</p>
              <p className="text-sm text-center text-muted">Search or scan a product<br/>to start billing</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="bg-surface border border-line p-4 rounded-xl shadow-card flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-ink">{item.product.name}</h3>
                    <div className="text-sm text-muted">{formatINR(item.product.selling_price || 0)} / {item.product.unit || "pkt"}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeItem(item.product.id)} aria-label="Remove item">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-subtle rounded-lg p-1 border border-line-subtle">
                    <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={() => updateQty(item.product.id, -1)} aria-label="Decrease quantity">
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-10 text-center font-bold text-ink">{item.quantity} {item.product.unit || "pkt"}</span>
                    <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={() => updateQty(item.product.id, 1)} aria-label="Increase quantity">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-ink">
                      {formatINR(((item.product.selling_price || 0) * item.quantity) * (1 - item.discountPct / 100))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Disc:</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={item.discountPct}
                      onChange={(e) => updateDiscount(item.product.id, parseInt(e.target.value) || 0)}
                      className="w-16 h-11 px-2 py-1 border border-line bg-subtle text-right focus:border-brand"
                    />
                    <span className="text-muted">%</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Checkout (Sticky on mobile) */}
        <div className="shrink-0 bg-surface border-t border-line p-4 rounded-b-xl lg:rounded-none shadow-[0_-4px_20px_rgba(0,0,0,0.03)] sticky bottom-0 z-20">
          <div className="space-y-2 mb-4 text-sm text-muted">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-medium text-ink">{formatINR(cartTotals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount</span>
              <span className="font-medium text-success">-{formatINR(cartTotals.discount)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST</span>
              <span className="font-medium text-ink">{formatINR(cartTotals.gst)}</span>
            </div>
          </div>

          <div className="h-px bg-line my-4 w-full"></div>

          <div className="flex justify-between items-end mb-6">
            <span className="font-semibold text-muted uppercase tracking-wider text-sm mb-1">Total</span>
            <span className="font-bold text-3xl text-brand">{formatINR(cartTotals.total)}</span>
          </div>

          <div className="flex gap-2 mb-4">
            {paymentOptions.map(({ mode, icon, label }) => (
              <Button
                key={mode}
                variant={paymentMode === mode ? "primary" : "outline"}
                className="flex-1 min-h-[44px] h-11 flex items-center justify-center gap-2"
                onClick={() => setPaymentMode(mode)}
              >
                {icon} {label}
              </Button>
            ))}
          </div>

          <Button
            onClick={handleCheckout}
            disabled={cart.length === 0 || loading}
            className="w-full h-14 min-h-[56px] text-lg font-semibold"
            loading={loading}
          >
            {loading ? "Processing..." : <><CheckCircle className="w-4 h-4" /> Complete Sale</>}
          </Button>
        </div>
      </div>

      {/* Thermal Receipt Modal matching exact reference image */}
      <Modal
        open={!!receipt}
        onClose={() => { setReceipt(null); searchInputRef.current?.focus(); }}
        title="Thermal Receipt"
        size="md"
      >
        <div className="flex flex-col items-center py-2 bg-slate-100/80 rounded-2xl p-4">
          
          {/* Thermal Paper Container */}
          <div className="w-full max-w-[340px] bg-[#FAF9F5] text-slate-800 font-mono text-xs p-6 shadow-xl border border-slate-200/80 relative rounded-sm selection:bg-amber-100">
            
            {/* Top Sawtooth Tear Effect */}
            <div className="absolute -top-2 left-0 right-0 h-2 bg-[#FAF9F5] [clip-path:polygon(0_100%,5%_0,10%_100%,15%_0,20%_100%,25%_0,30%_100%,35%_0,40%_100%,45%_0,50%_100%,55%_0,60%_100%,65%_0,70%_100%,75%_0,80%_100%,85%_0,90%_100%,95%_0,100%_100%)]"></div>

            {/* Header */}
            <div className="text-center space-y-1 mb-3">
              <h2 className="text-base font-bold tracking-widest text-slate-900 uppercase">
                {store?.name || "GREEN QUANT STORE"}
              </h2>
              {store?.address ? (
                <p className="text-[10px] text-slate-600">Address: {store.address}</p>
              ) : (
                <p className="text-[10px] text-slate-600">Address: Market Yard, Retail Hub</p>
              )}
              {store?.phone ? (
                <p className="text-[10px] text-slate-600">Tele: {store.phone}</p>
              ) : (
                <p className="text-[10px] text-slate-600">Tele: +91 98765 43210</p>
              )}
              {store?.gst_number && (
                <p className="text-[10px] text-slate-800 font-bold tracking-wider">GSTIN: {store.gst_number}</p>
              )}
            </div>

            <div className="text-center text-slate-400 my-2 select-none">**********************************</div>

            <div className="text-center font-bold text-slate-900 tracking-wider py-0.5 uppercase">
              {paymentMode} RECEIPT
            </div>

            <div className="text-center text-slate-400 my-2 select-none">**********************************</div>

            {/* Table Header */}
            <div className="flex justify-between font-bold text-slate-900 mb-2 border-b border-slate-300 pb-1">
              <span>Description</span>
              <span>Price</span>
            </div>

            {/* Item Lines */}
            <div className="space-y-2 mb-3">
              {receipt?.lines.map((l, i) => {
                const unitPriceRs = (l.unit_price / 100).toFixed(2);
                const lineTotalRs = (l.line_total / 100).toFixed(2);
                const unitTag = l.unit ? ` (${l.unit})` : " (pkt)";
                return (
                  <div key={i} className="flex justify-between items-start leading-tight">
                    <div className="pr-2 flex-1">
                      <p className="font-semibold text-slate-900">{l.name}</p>
                      <p className="text-[10px] text-slate-500">{l.qty} × ₹{unitPriceRs}{unitTag}</p>
                    </div>
                    <div className="font-bold text-slate-900 text-right">₹{lineTotalRs}</div>
                  </div>
                );
              })}
            </div>

            <div className="text-center text-slate-400 my-2 select-none">**********************************</div>

            {/* Totals Section */}
            <div className="space-y-1 text-slate-700">
              <div className="flex justify-between font-bold text-slate-900 text-sm py-1 border-b border-slate-300">
                <span>Total</span>
                <span className="text-base font-black">₹{receipt ? (receipt.grand_total / 100).toFixed(2) : "0.00"}</span>
              </div>
              <div className="flex justify-between pt-1 text-[11px]">
                <span>Subtotal</span>
                <span>₹{receipt ? (receipt.subtotal / 100).toFixed(2) : "0.00"}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>GST Tax</span>
                <span>₹{receipt ? (receipt.gst_total / 100).toFixed(2) : "0.00"}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Payment Mode</span>
                <span>{paymentMode}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Change</span>
                <span>₹0.00</span>
              </div>
            </div>

            <div className="text-center text-slate-400 my-2 select-none">**********************************</div>

            <div className="flex justify-between text-[10px] text-slate-600">
              <span>Approval Code</span>
              <span className="font-bold text-slate-800">#{receipt?.receipt_no}</span>
            </div>

            <div className="text-center text-slate-400 my-2 select-none">**********************************</div>

            {/* Footer Thank You & Barcode */}
            <div className="text-center space-y-3 pt-1">
              <p className="font-bold text-slate-900 tracking-widest text-sm uppercase">THANK YOU!</p>
              
              {/* Authentic Barcode Lines */}
              <div className="flex justify-center items-center gap-[2px] h-9 opacity-85 px-4 pt-1">
                {[2,1,3,1,4,2,1,3,1,2,4,1,2,3,1,2,1,4,2,1,3,2,1,3,1,4,2,1,3,1,2,4,1].map((w, idx) => (
                  <div key={idx} className="h-full bg-slate-900" style={{ width: `${w}px` }}></div>
                ))}
              </div>
              <p className="text-[9px] text-slate-500 font-mono tracking-widest">{receipt?.receipt_no}</p>
            </div>

            {/* Bottom Sawtooth Tear Effect */}
            <div className="absolute -bottom-2 left-0 right-0 h-2 bg-[#FAF9F5] [clip-path:polygon(0_0,5%_100%,10%_0,15%_100%,20%_0,25%_100%,30%_0,35%_100%,40%_0,45%_100%,50%_0,55%_100%,60%_0,65%_100%,70%_0,75%_100%,80%_0,85%_100%,90%_0,95%_100%,100%_0)]"></div>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex gap-3 w-full max-w-[340px] pt-4">
            <Button variant="outline" className="flex-1" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> Print
            </Button>
            <Button className="flex-1" onClick={() => { setReceipt(null); searchInputRef.current?.focus(); }}>
              <Plus className="w-4 h-4" /> New Sale
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}