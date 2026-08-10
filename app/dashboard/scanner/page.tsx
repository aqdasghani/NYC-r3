"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ScanLine, CheckCircle2, AlertTriangle, Upload, RotateCcw, FileText, QrCode, Search, PackagePlus } from "lucide-react";
import { confirmReceipt, scanInvoice, getProductByBarcode, getProducts, createProduct } from "@/lib/api";
import { BarcodeScanner } from "@/components/scanner/BarcodeScanner";
import type { ExtractedItem, ScanInvoiceResponse, ProductOut } from "@/lib/backend-types";
import { formatINR } from "@/lib/utils";

type Stage = "idle" | "scanning" | "preview" | "done";
type Tab = "invoice" | "barcode" | "manual";

export default function ScannerPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Invoice OCR State
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<ScanInvoiceResponse | null>(null);
  const [included, setIncluded] = useState<Set<number>>(new Set());
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  
  // Global Tab State
  const [activeTab, setActiveTab] = useState<Tab>("invoice");
  
  // Barcode / Manual State
  const [scannedProduct, setScannedProduct] = useState<ProductOut | null>(null);
  const [isSearchingBarcode, setIsSearchingBarcode] = useState(false);
  const [manualProducts, setManualProducts] = useState<ProductOut[]>([]);
  
  // New Product Form State
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [newProductPurchasePrice, setNewProductPurchasePrice] = useState<number | "">("");
  const [newProductSellingPrice, setNewProductSellingPrice] = useState<number | "">("");
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Focus Refs
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const newProductNameRef = useRef<HTMLInputElement>(null);

  // Manual Entry Form State
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [manualQty, setManualQty] = useState<number>(1);
  const [manualPrice, setManualPrice] = useState<number>(0);
  const [manualExpiry, setManualExpiry] = useState<string>("");
  const [manualBatch, setManualBatch] = useState<string>("");

  useEffect(() => {
    if (activeTab === "manual" && manualProducts.length === 0) {
      getProducts().then(setManualProducts).catch(console.error);
    }
  }, [activeTab, manualProducts.length]);

  // --- Invoice Functions ---
  const handleFile = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    setStage("scanning");
    setError(null);
    setSummary(null);
    try {
      const res = await scanInvoice(file);
      setResult(res);
      setIncluded(new Set(res.extracted_items.map((_, i) => i)));
      setStage("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR failed — is the backend running?");
      setStage("idle");
    }
  };

  const toggle = (index: number) => {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!result) return;
    const selected = result.extracted_items
      .map((item, i) => ({ item, i }))
      .filter(({ i }) => included.has(i))
      .filter(({ item }) => item.matched_product_id);
    if (selected.length === 0) {
      setError("No matched products selected — only items matched to your catalogue can be added.");
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      const payload = selected.map(({ item }) => ({
        product_id: item.matched_product_id as string,
        quantity: item.quantity,
        purchase_price: item.price ?? undefined,
        expiry_date: item.expiry_date ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        batch_number: item.batch_number ?? undefined,
      }));
      const res = await confirmReceipt(payload);
      setSummary(
        `Added ${res.created_batch_ids.length} batch(es) — ${res.detection_summary.risks_detected} risks detected, ${res.detection_summary.recommendations_created} AI action(s) queued.`
      );
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm receipt");
    } finally {
      setConfirming(false);
    }
  };

  // --- Barcode / Manual Receiving Functions ---
  const handleBarcodeScan = async (code: string) => {
    setIsSearchingBarcode(true);
    setError(null);
    setNotFoundBarcode(null);
    try {
      const prod = await getProductByBarcode(code);
      setScannedProduct(prod);
      // Pre-fill manual form with product defaults
      setSelectedProductId(prod.id);
      setManualPrice(prod.purchase_price || 0);
      
      // Auto-focus quantity input
      setTimeout(() => qtyInputRef.current?.focus(), 100);
    } catch (err) {
      setNotFoundBarcode(code);
      setNewProductName("");
      setNewProductCategory("");
      setNewProductPurchasePrice("");
      setNewProductSellingPrice("");
      setTimeout(() => newProductNameRef.current?.focus(), 100);
    } finally {
      setIsSearchingBarcode(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notFoundBarcode) return;
    setIsCreatingProduct(true);
    setError(null);
    try {
      const prod = await createProduct({
        name: newProductName,
        barcode: notFoundBarcode,
        category: newProductCategory,
        purchase_price: Number(newProductPurchasePrice),
        selling_price: Number(newProductSellingPrice)
      });
      setSummary(`Created new product: ${prod.name}`);
      setScannedProduct(prod);
      setSelectedProductId(prod.id);
      setManualPrice(prod.purchase_price || 0);
      setNotFoundBarcode(null); // hide form
      
      setTimeout(() => qtyInputRef.current?.focus(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleManualReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;
    
    setConfirming(true);
    setError(null);
    try {
      const payload = [{
        product_id: selectedProductId,
        quantity: manualQty,
        purchase_price: manualPrice || undefined,
        expiry_date: manualExpiry || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        batch_number: manualBatch || undefined,
      }];
      
      const res = await confirmReceipt(payload);
      setSummary(`Added batch successfully. AI Queued ${res.detection_summary.recommendations_created} actions.`);
      
      // reset form
      if (activeTab === "manual") {
        setSelectedProductId("");
      } else {
        setScannedProduct(null);
      }
      setManualQty(1);
      setManualPrice(0);
      setManualExpiry("");
      setManualBatch("");
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not receive product");
    } finally {
      setConfirming(false);
    }
  };

  const reset = () => {
    setStage("idle");
    setResult(null);
    setIncluded(new Set());
    setFileName(null);
    setError(null);
    setSummary(null);
    setScannedProduct(null);
    setNotFoundBarcode(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const matched = result?.extracted_items.filter((it) => it.matched_product_id).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Smart Receiving</h1>
          <p className="text-text-secondary">
            Process invoices, scan barcodes, or enter stock manually.
          </p>
        </div>
        {(stage !== "idle" || scannedProduct) && (
          <button
            onClick={reset}
            className="flex items-center gap-2 glass-panel px-4 py-2 rounded-lg text-sm font-medium hover:bg-bg-surface/80 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Start Over
          </button>
        )}
      </div>

      {error && (
        <div className="glass-panel border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-500 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      
      {summary && stage === "done" && (
        <div className="glass-panel border border-brand-green/20 bg-brand-green/5 px-4 py-3 text-sm text-brand-green flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {summary}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border-default pb-2">
        {(["invoice", "barcode", "manual"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setActiveTab(t); reset(); }}
            className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-[9px] ${
              activeTab === t ? "text-brand-green border-brand-green" : "text-text-secondary border-transparent hover:text-text-primary"
            }`}
          >
            {t === "invoice" && "Invoice OCR"}
            {t === "barcode" && "Barcode Scanner"}
            {t === "manual" && "Manual Entry"}
          </button>
        ))}
      </div>

      {/* --- INVOICE TAB --- */}
      {activeTab === "invoice" && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload / scanning area */}
        <div className="glass-panel p-4 flex flex-col items-center justify-center min-h-[420px] relative overflow-hidden bg-slate-50 rounded-2xl">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />

          <AnimatePresence mode="wait">
            {stage === "idle" && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-4 mx-auto">
                  <Camera className="w-8 h-8 text-text-muted" />
                </div>
                <p className="text-text-secondary mb-2">Upload an invoice image or PDF.</p>
                <p className="text-xs text-text-muted mb-6">Powered by Gemini 2.5 Flash API.</p>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="bg-brand-green text-black px-6 py-3 rounded-lg font-semibold hover:bg-brand-green/90 transition-colors shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center gap-2 mx-auto"
                >
                  <Upload className="w-4 h-4" /> Choose Invoice
                </button>
              </motion.div>
            )}

            {stage === "scanning" && (
              <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
                  className="w-16 h-16 rounded-2xl bg-brand-green/10 border-2 border-brand-green/50 flex items-center justify-center mb-4 mx-auto"
                >
                  <ScanLine className="w-8 h-8 text-brand-green" />
                </motion.div>
                <p className="text-text-primary font-medium">Extracting from {fileName ?? "invoice"}…</p>
                <p className="text-xs text-text-muted mt-2">Detecting products, quantities, batches & expiry</p>
              </motion.div>
            )}

            {stage === "done" && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-brand-green/10 border border-brand-green/30 flex items-center justify-center mb-4 mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-brand-green" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">Receipt Confirmed!</h3>
                <p className="text-text-secondary text-sm max-w-sm">Products added to inventory</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Extracted items */}
        <div className="space-y-4">
          {stage === "preview" && result && (
            <>
              <div className="glass-panel p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-text-primary flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-green" /> Extracted Items
                  </h3>
                  <span className="text-xs text-text-secondary">
                    {matched}/{result.extracted_items.length} matched
                  </span>
                </div>
                <div className="space-y-2 max-h-[380px] overflow-y-auto">
                  {result.extracted_items.map((item, i) => {
                    const on = included.has(i);
                    return (
                      <label
                        key={i}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          on ? "border-brand-green/40 bg-brand-green/5" : "border-border-default bg-bg-surface/40 opacity-70"
                        }`}
                      >
                        <input type="checkbox" checked={on} onChange={() => toggle(i)} className="mt-1 accent-[#0FA958]" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-text-primary truncate">{item.product_name}</span>
                            <span className="text-xs text-text-secondary shrink-0">× {item.quantity}</span>
                          </div>
                          <div className="text-xs text-text-muted mt-0.5 flex flex-wrap gap-x-3">
                            {item.price != null && <span>{formatINR(item.price)}</span>}
                            {item.batch_number && <span>Batch {item.batch_number}</span>}
                            {item.expiry_date && <span>Exp {item.expiry_date}</span>}
                          </div>
                          <div className="mt-1">
                            {item.matched_product_id ? (
                              <span className="text-[10px] text-brand-green font-semibold">✓ MATCHED · {Math.round(item.confidence * 100)}%</span>
                            ) : (
                              <span className="text-[10px] text-orange-400 font-semibold">NO CATALOGUE MATCH</span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={handleConfirm}
                disabled={confirming || matched === 0}
                className="w-full flex items-center justify-center gap-2 bg-brand-green text-black px-5 py-3 rounded-lg font-semibold hover:bg-brand-green/90 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5" />
                {confirming ? "Adding to inventory…" : `Confirm ${matched} item${matched === 1 ? "" : "s"} → Inventory`}
              </button>
            </>
          )}

          {stage === "done" && (
            <button onClick={reset} className="w-full glass-panel px-5 py-3 rounded-lg font-semibold hover:bg-bg-surface/80 transition-colors">
              Scan Another Invoice
            </button>
          )}

          {stage === "idle" && (
            <div className="glass-panel p-6 text-sm text-text-secondary leading-relaxed">
              <h4 className="font-bold text-text-primary mb-2">How it works</h4>
              <ul className="space-y-2 list-disc pl-5">
                <li>Upload a supplier invoice photo or PDF.</li>
                <li>Gemini AI extracts line items, quantities and prices.</li>
                <li>Items are matched to your catalogue by fuzzy name matching.</li>
                <li>Confirm to create inventory batches (FEFO) and queue AI actions.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
      )}

      {/* --- BARCODE TAB --- */}
      {activeTab === "barcode" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-panel p-4 flex flex-col items-center justify-center min-h-[420px] bg-slate-50 rounded-2xl relative">
            <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-brand-green" /> Scan Barcode / QR
            </h3>
            {isSearchingBarcode ? (
              <div className="text-brand-green flex flex-col items-center">
                 <ScanLine className="w-8 h-8 animate-spin" />
                 <p className="mt-2 font-semibold">Looking up product...</p>
              </div>
            ) : (
              <BarcodeScanner onScan={handleBarcodeScan} />
            )}
          </div>
          <div className="space-y-4">
            {scannedProduct ? (
              <form onSubmit={handleManualReceive} className="glass-panel p-6 space-y-4">
                <h3 className="text-xl font-bold text-text-primary mb-2">Receive Stock</h3>
                <div className="p-4 bg-brand-green/5 border border-brand-green/20 rounded-lg text-sm mb-4">
                  <p className="font-semibold text-brand-green">{scannedProduct.name}</p>
                  <p className="text-text-secondary">Code: {scannedProduct.barcode}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Quantity</label>
                    <input ref={qtyInputRef} type="number" value={manualQty} onChange={(e) => setManualQty(Number(e.target.value))} required min={1} className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Purchase Price</label>
                    <input type="number" step="0.01" value={manualPrice} onChange={(e) => setManualPrice(Number(e.target.value))} required className="w-full px-3 py-2 border rounded-md" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Batch Number (Optional)</label>
                  <input type="text" value={manualBatch} onChange={(e) => setManualBatch(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Expiry Date (YYYY-MM-DD)</label>
                  <input type="date" value={manualExpiry} onChange={(e) => setManualExpiry(e.target.value)} required className="w-full px-3 py-2 border rounded-md" />
                </div>
                
                <button type="submit" disabled={confirming} className="w-full bg-brand-green text-black px-4 py-2 rounded-lg font-bold hover:bg-brand-green/90 transition-colors disabled:opacity-50">
                  {confirming ? "Saving..." : "Add to Inventory"}
                </button>
              </form>
            ) : notFoundBarcode ? (
              <form onSubmit={handleCreateProduct} className="glass-panel p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <PackagePlus className="w-6 h-6 text-brand-green" />
                  <h3 className="text-xl font-bold text-text-primary">Create New Product</h3>
                </div>
                <p className="text-sm text-text-secondary">
                  Product not found. Enter details to add it to your catalogue.
                </p>

                <div>
                  <label className="block text-sm font-medium mb-1 text-text-primary">Barcode</label>
                  <input type="text" value={notFoundBarcode} disabled className="w-full px-3 py-2 border border-border-default rounded-md bg-bg-surface/50 text-text-muted cursor-not-allowed" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-primary">Product Name</label>
                  <input ref={newProductNameRef} type="text" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} required className="w-full px-3 py-2 border border-border-default rounded-md" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-text-primary">Category</label>
                  <input type="text" value={newProductCategory} onChange={(e) => setNewProductCategory(e.target.value)} className="w-full px-3 py-2 border border-border-default rounded-md" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-text-primary">Purchase Price (₹)</label>
                    <input type="number" step="0.01" value={newProductPurchasePrice} onChange={(e) => setNewProductPurchasePrice(e.target.value ? Number(e.target.value) : "")} required className="w-full px-3 py-2 border border-border-default rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-text-primary">Selling Price (₹)</label>
                    <input type="number" step="0.01" value={newProductSellingPrice} onChange={(e) => setNewProductSellingPrice(e.target.value ? Number(e.target.value) : "")} required className="w-full px-3 py-2 border border-border-default rounded-md" />
                  </div>
                </div>

                <button type="submit" disabled={isCreatingProduct} className="w-full bg-brand-green text-black px-4 py-2 rounded-lg font-bold hover:bg-brand-green/90 transition-colors disabled:opacity-50">
                  {isCreatingProduct ? "Creating..." : "Create Product"}
                </button>
              </form>
            ) : (
              <div className="glass-panel p-6 text-sm text-text-secondary leading-relaxed">
                <h4 className="font-bold text-text-primary mb-2">How it works</h4>
                <ul className="space-y-2 list-disc pl-5">
                  <li>Allow camera access when prompted.</li>
                  <li>Point your camera at a product barcode or QR code.</li>
                  <li>GreenShop will instantly look up the product in your catalogue.</li>
                  <li>You can quickly add received stock or check product details.</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MANUAL ENTRY TAB --- */}
      {activeTab === "manual" && (
        <div className="max-w-2xl mx-auto glass-panel p-6 rounded-2xl space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <PackagePlus className="w-6 h-6 text-brand-green" />
            <h2 className="text-xl font-bold text-text-primary">Manual Stock Entry</h2>
          </div>
          <form onSubmit={handleManualReceive} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1 text-text-primary">Product</label>
              <select 
                value={selectedProductId} 
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  const prod = manualProducts.find((p) => p.id === e.target.value);
                  if (prod) setManualPrice(prod.purchase_price || 0);
                }}
                required 
                className="w-full px-3 py-2 border border-border-default rounded-md bg-white text-text-primary"
              >
                <option value="">Select a product...</option>
                {manualProducts.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-text-primary">Quantity</label>
                <input type="number" value={manualQty} onChange={(e) => setManualQty(Number(e.target.value))} required min={1} className="w-full px-3 py-2 border border-border-default rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-text-primary">Purchase Price (₹)</label>
                <input type="number" step="0.01" value={manualPrice} onChange={(e) => setManualPrice(Number(e.target.value))} required className="w-full px-3 py-2 border border-border-default rounded-md" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-text-primary">Batch Number</label>
              <input type="text" placeholder="e.g. BATCH-2234" value={manualBatch} onChange={(e) => setManualBatch(e.target.value)} className="w-full px-3 py-2 border border-border-default rounded-md" />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-text-primary">Expiry Date</label>
              <input type="date" value={manualExpiry} onChange={(e) => setManualExpiry(e.target.value)} required className="w-full px-3 py-2 border border-border-default rounded-md" />
            </div>

            <button type="submit" disabled={confirming || !selectedProductId} className="w-full bg-brand-green text-black px-4 py-3 rounded-lg font-bold hover:bg-brand-green/90 transition-colors disabled:opacity-50">
              {confirming ? "Saving..." : "Confirm & Add to Inventory"}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
