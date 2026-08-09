"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, Barcode, X, Package, Check, RefreshCw, AlertCircle, CheckCircle2, ArrowRight, Sparkles, Clock, Tag } from "lucide-react";
import { getProducts, createProduct, getProductByBarcode, confirmReceipt } from "@/lib/api";
import { BarcodeScanner } from "@/components/scanner/BarcodeScanner";
import type { ProductOut } from "@/lib/backend-types";
import { Button, Card, CardHeader, DataTable, type Column, EmptyState, Field, Input, Select, Modal, KpiCard } from "@/components/ui";

const STATUS_LABELS: Record<string, string> = {
  CRITICAL: "Critical",
  WARNING: "Warning",
  UPCOMING: "Upcoming",
  SAFE: "Safe",
  DEAD_STOCK: "Dead Stock",
  OVERSTOCK: "Overstock",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");

  // Scanned Product Result State
  const [scannedResult, setScannedResult] = useState<{
    code: string;
    product?: ProductOut;
    isNew: boolean;
  } | null>(null);

  const [scanMessage, setScanMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Scan Receiving & Quick Stock State
  const [scanQty, setScanQty] = useState<number>(1);
  const [scanReceivePrice, setScanReceivePrice] = useState<string>("0");
  const [scanCellPrice, setScanCellPrice] = useState<string>("0");
  const [scanTimestamp, setScanTimestamp] = useState<string>("");
  const [isReceivingStock, setIsReceivingStock] = useState(false);
  const [receiveSuccessMsg, setReceiveSuccessMsg] = useState<string | null>(null);

  // Form State
  const [newProductName, setNewProductName] = useState("");
  const [newProductSku, setNewProductSku] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("Pantry");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductPurchasePrice, setNewProductPurchasePrice] = useState("");
  const [newProductBarcode, setNewProductBarcode] = useState("");
  const [newProductGst, setNewProductGst] = useState("5");
  const [newProductUnit, setNewProductUnit] = useState("pkt");
  const [isSaving, setIsSaving] = useState(false);

  const fetchProductsList = async (query?: string) => {
    setLoading(true);
    try {
      const data = await getProducts(query);
      setProducts(data);
    } catch (err) {
      console.error("Failed to fetch products list", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProductsList(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleScanCode = async (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;
    setScanMessage({ text: `Scanning barcode ${cleanCode}...`, type: "info" });
    setReceiveSuccessMsg(null);

    const now = new Date();
    const formattedDate = now.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    setScanTimestamp(formattedDate);

    try {
      const prod = await getProductByBarcode(cleanCode);
      setScannedResult({ code: cleanCode, product: prod, isNew: false });
      setScanQty(1);
      setScanReceivePrice(prod.purchase_price ? String(prod.purchase_price) : "0");
      setScanCellPrice(prod.selling_price ? String(prod.selling_price) : "0");
      setScanMessage({ text: `Barcode Matched: ${prod.name}`, type: "success" });
    } catch {
      setScannedResult({ code: cleanCode, isNew: true });
      setScanQty(1);
      setScanReceivePrice("0");
      setScanCellPrice("0");
      setScanMessage({ text: `New Barcode Detected: ${cleanCode}`, type: "info" });
    }
  };

  const handleQuickReceive = async () => {
    if (!scannedResult?.product) return;
    setIsReceivingStock(true);
    setReceiveSuccessMsg(null);
    try {
      const qty = Number(scanQty) || 1;
      const receivePriceNum = Number(scanReceivePrice) || 0;
      
      const expiry = new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);
      await confirmReceipt([
        {
          product_id: scannedResult.product.id,
          quantity: qty,
          purchase_price: receivePriceNum,
          expiry_date: expiry,
          batch_number: `SCAN-${Date.now().toString().slice(-6)}`,
        },
      ]);
      setReceiveSuccessMsg(`Successfully added ${qty} units of ${scannedResult.product.name} at ₹${receivePriceNum} (Scanned: ${scanTimestamp})`);
      await fetchProductsList();
    } catch (err) {
      console.error("Failed to receive stock", err);
    } finally {
      setIsReceivingStock(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;
    setIsSaving(true);
    try {
      const created = await createProduct({
        name: newProductName.trim(),
        category: newProductCategory,
        barcode: newProductBarcode.trim() || undefined,
        selling_price: parseFloat(newProductPrice) || 0,
        purchase_price: parseFloat(newProductPurchasePrice) || 0,
        gst_rate: parseFloat(newProductGst) || 0,
        sku: newProductSku.trim() || undefined,
        unit: newProductUnit,
      });

      setProducts((prev) => [created, ...prev]);

      // Reset form
      setNewProductName("");
      setNewProductSku("");
      setNewProductBarcode("");
      setNewProductPrice("");
      setNewProductPurchasePrice("");
      setNewProductUnit("pkt");
      setIsAddModalOpen(false);
      await fetchProductsList();
    } catch (err) {
      console.error("Failed to save new product", err);
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<ProductOut>[] = [
    {
      key: "name",
      header: "Product Name",
      sortValue: (r) => r.name,
      render: (r) => (
        <div>
          <div className="font-medium text-ink">{r.name}</div>
          <div className="text-xs text-muted font-mono">{r.id}</div>
        </div>
      ),
    },
    {
      key: "barcode",
      header: "Barcode",
      sortValue: (r) => r.barcode || "",
      render: (r) => (
        r.barcode ? (
          <span className="inline-flex items-center gap-1 font-mono text-ink bg-subtle px-2 py-0.5 rounded">
            <Barcode className="w-3 h-3 text-muted" />
            {r.barcode}
          </span>
        ) : (
          <span className="text-muted">—</span>
        )
      ),
    },
    {
      key: "sku",
      header: "SKU",
      sortValue: (r) => r.sku || "",
      render: (r) => (
        <span className="font-mono text-dim">{r.sku || "—"}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortValue: (r) => r.category || "",
      render: (r) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-subtle text-dim text-[10px] font-medium">
          {r.category || "General"}
        </span>
      ),
    },
    {
      key: "selling_price",
      header: "Selling Price (₹)",
      align: "right",
      sortValue: (r) => r.selling_price || 0,
      render: (r) => (
        <span className="font-mono font-medium text-ink text-right">
          ₹{(r.selling_price || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "purchase_price",
      header: "Cost Price (₹)",
      align: "right",
      sortValue: (r) => r.purchase_price || 0,
      render: (r) => (
        <span className="font-mono text-dim text-right">
          ₹{(r.purchase_price || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "lead_time_days",
      header: "Lead Time",
      align: "right",
      sortValue: (r) => r.lead_time_days || 0,
      render: (r) => (
        <span className="text-dim text-right">{r.lead_time_days || 2} Days</span>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink flex items-center gap-2">
            <Package className="w-5 h-5 text-brand" /> Products & Inventory Catalogue
          </h1>
          <p className="text-xs text-muted">
            Scan barcodes or register SKUs to manage prices, categories, and stock.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => { setScannedResult(null); setScanMessage(null); setIsScannerOpen(true); }}>
            <Barcode className="w-4 h-4 text-brand" /> Scan Barcode
          </Button>
          <Button onClick={() => { setNewProductBarcode(""); setIsAddModalOpen(true); }}>
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <Input
            placeholder="Search by product name, barcode, or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" onClick={() => fetchProductsList(searchTerm)} title="Refresh" aria-label="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <Card noPadding>
        <DataTable<ProductOut>
          columns={columns}
          rows={products}
          rowKey={(r) => r.id}
          loading={loading}
          emptyState={
            <EmptyState
              icon={<Package className="h-12 w-12 text-brand/50" />}
              title="No products found"
              description="Scan a barcode using your webcam or click Add Product to register inventory into the database."
              action={
                <Button onClick={() => setIsAddModalOpen(true)}>Add First Product</Button>
              }
            />
          }
        />
      </Card>

      {/* Add Product Modal */}
      <Modal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Product to Database"
        size="lg"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Product Name" required>
                <Input
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="e.g. Amul Taaza Milk 500ml"
                  required
                />
              </Field>
            </div>
            <div>
              <Field label="Barcode (EAN-13 / UPC)">
                <Input
                  value={newProductBarcode}
                  onChange={(e) => setNewProductBarcode(e.target.value)}
                  placeholder="e.g. 8901234567890"
                />
              </Field>
            </div>
            <div>
              <Field label="SKU">
                <Input
                  value={newProductSku}
                  onChange={(e) => setNewProductSku(e.target.value)}
                  placeholder="e.g. AMUL-MILK-500"
                />
              </Field>
            </div>
            <div>
              <Field label="Category">
                <Input
                  value={newProductCategory}
                  onChange={(e) => setNewProductCategory(e.target.value)}
                  placeholder="e.g. Dairy / Beverages"
                />
              </Field>
            </div>
            <div>
              <Field label="Unit">
                <Input
                  value={newProductUnit}
                  onChange={(e) => setNewProductUnit(e.target.value)}
                  placeholder="e.g. pkt, box, kg"
                />
              </Field>
            </div>
            <div>
              <Field label="GST Rate (%)">
                <Input
                  type="number"
                  value={newProductGst}
                  onChange={(e) => setNewProductGst(e.target.value)}
                  placeholder="5"
                />
              </Field>
            </div>
            <div>
              <Field label="Selling Price (₹)" required>
                <Input
                  type="number"
                  step="0.01"
                  value={newProductPrice}
                  onChange={(e) => setNewProductPrice(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </Field>
            </div>
            <div>
              <Field label="Cost Price (₹)">
                <Input
                  type="number"
                  step="0.01"
                  value={newProductPurchasePrice}
                  onChange={(e) => setNewProductPurchasePrice(e.target.value)}
                  placeholder="0.00"
                />
              </Field>
            </div>
          </div>

          <div className="pt-4 border-t border-line flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Product'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Real Barcode Scanner Modal (Camera & Real Decoder) */}
      <Modal
        open={isScannerOpen}
        onClose={() => { setIsScannerOpen(false); setScanMessage(null); setScannedResult(null); setReceiveSuccessMsg(null); }}
        title="Scan Product Barcode"
        size="lg"
      >
        <div className="space-y-4">
          {/* Scanner Feed Container */}
          <div className="rounded-xl overflow-hidden border border-line bg-canvas">
            <BarcodeScanner onScan={handleScanCode} />
          </div>

          {/* Scanned Result Action Card */}
          {scannedResult ? (
            <div className="rounded-xl border border-line bg-surface p-4 space-y-4 text-sm shadow-sm">
              {scannedResult.product ? (
                <div className="space-y-3">
                  {/* Status Banner */}
                  <div className="flex items-center justify-between text-success font-medium">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Product Found in Database
                    </span>
                    <span className="font-mono bg-canvas px-2.5 py-1 rounded border border-line text-xs font-bold text-ink">
                      {scannedResult.code}
                    </span>
                  </div>

                  {/* Product Details Header */}
                  <div className="bg-subtle p-3 rounded-lg border border-line-subtle space-y-1">
                    <div className="font-bold text-base text-brand">{scannedResult.product.name}</div>
                    <div className="text-xs text-muted">
                      Category: <strong className="text-dim">{scannedResult.product.category || "General"}</strong>
                    </div>
                  </div>

                  {/* Auto-Placed Date & Time Badge */}
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs">
                    <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
                      <Clock className="w-4 h-4 text-brand" /> Auto Date & Time:
                    </span>
                    <span className="font-mono font-bold text-brand-green-dark bg-white px-2.5 py-1 rounded border border-slate-300">
                      {scanTimestamp}
                    </span>
                  </div>

                  {/* Details Grid: Quantity, Price of Receive, Price of Cell */}
                  <div className="grid grid-cols-3 gap-3 bg-canvas p-3 rounded-lg border border-line">
                    <div>
                      <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={scanQty}
                        onChange={(e) => setScanQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-sm font-bold font-mono px-2.5 py-1.5 border border-line rounded bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                        Price of Receive (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={scanReceivePrice}
                        onChange={(e) => setScanReceivePrice(e.target.value)}
                        className="w-full text-sm font-bold font-mono px-2.5 py-1.5 border border-line rounded bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                        Price of Cell (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={scanCellPrice}
                        onChange={(e) => setScanCellPrice(e.target.value)}
                        className="w-full text-sm font-bold font-mono px-2.5 py-1.5 border border-line rounded bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
                      />
                    </div>
                  </div>

                  {/* Success Banner */}
                  {receiveSuccessMsg && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{receiveSuccessMsg}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={handleQuickReceive}
                      disabled={isReceivingStock}
                      className="flex-1 bg-brand-green hover:bg-brand-green-dark text-white font-bold"
                    >
                      {isReceivingStock ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Confirm & Add Stock
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { setSearchTerm(scannedResult.code); setIsScannerOpen(false); }}
                    >
                      Highlight in Catalog <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-info font-medium">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-brand" /> New Barcode Detected
                    </span>
                    <span className="font-mono bg-info-soft px-2 py-0.5 rounded border border-info/20 text-xs">
                      {scannedResult.code}
                    </span>
                  </div>

                  {/* Auto-Placed Date & Time Badge */}
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs">
                    <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
                      <Clock className="w-4 h-4 text-brand" /> Auto Date & Time:
                    </span>
                    <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-300">
                      {scanTimestamp}
                    </span>
                  </div>

                  <p className="text-xs text-muted">
                    Barcode <strong>{scannedResult.code}</strong> is not registered in your store catalogue yet.
                  </p>
                  <Button
                    onClick={() => { setIsScannerOpen(false); setNewProductBarcode(scannedResult.code); setIsAddModalOpen(true); }}
                    className="w-full"
                  >
                    Register New Product Now <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ) : scanMessage ? (
            <div className={`rounded-lg p-3 text-center text-xs font-medium border ${
              scanMessage.type === "success"
                ? "bg-success-soft text-success border-success/30"
                : "bg-info-soft text-info border-info/30"
            }`}>
              {scanMessage.text}
            </div>
          ) : null}

          {/* Manual Barcode Input Fallback */}
          <div className="border-t border-line pt-4 space-y-2 text-sm">
            <p className="font-medium text-muted">Or Type Barcode Number Manually:</p>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="e.g. 8901030940387"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="flex-1 font-mono"
              />
              <Button onClick={() => handleScanCode(barcodeInput)}>Lookup</Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}