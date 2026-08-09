"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, Box, Layers, CheckCircle2, Calendar, UserCheck, Barcode } from "lucide-react";
import { createProduct, confirmReceipt, getSuppliers, getProducts } from "@/lib/api";
import type { ProductOut, SupplierOut } from "@/lib/backend-types";
import { formatINR } from "@/lib/utils";

type UnitType = "Piece" | "Packet" | "Box";

interface MobileReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function MobileReceiveModal({ isOpen, onClose, onSuccess }: MobileReceiveModalProps) {
  const getDefaultExpiry = () => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [products, setProducts] = useState<ProductOut[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOut[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitType, setUnitType] = useState<UnitType>("Piece");
  const [boxSize, setBoxSize] = useState<number>(12); // Units per box/packet
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [batchNumber, setBatchNumber] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<string>(getDefaultExpiry());
  const [supplierId, setSupplierId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getProducts().then(setProducts).catch(console.error);
      getSuppliers().then(setSuppliers).catch(console.error);
    }
  }, [isOpen]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Compute total pieces from packaging unit selection
  const totalPieces = unitType === "Box" ? quantity * boxSize : unitType === "Packet" ? quantity * boxSize : quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setError("Please select a product first.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const payload = [{
        product_id: selectedProductId,
        quantity: totalPieces,
        purchase_price: purchasePrice || undefined,
        expiry_date: expiryDate || getDefaultExpiry(),
        batch_number: batchNumber.trim() || undefined,
        supplier_id: supplierId || undefined
      }];

      const res = await confirmReceipt(payload);
      onSuccess(`✓ Added ${totalPieces} units (${unitType}) of ${selectedProduct?.name || 'stock'}. Inventory updated!`);
      
      // Reset
      setSelectedProductId("");
      setQuantity(1);
      setUnitType("Piece");
      setBatchNumber("");
      setExpiryDate(getDefaultExpiry());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to receive stock");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200"
        >
          {/* Mobile Header */}
          <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-6 h-6 text-brand-green" />
              <div>
                <h3 className="font-bold text-lg leading-tight">Worker Mobile Receiving</h3>
                <p className="text-xs text-slate-400">1-Touch Receiving & Stock Batch Update</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
                {error}
              </div>
            )}

            {/* Step 1: Select / Search Product */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">1. Select Product</label>
              <select
                required
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  const p = products.find(prod => prod.id === e.target.value);
                  if (p) setPurchasePrice(p.purchase_price || 0);
                }}
                className="w-full px-3 py-3 border border-slate-300 rounded-xl text-sm bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-brand-green outline-none"
              >
                <option value="">-- Choose Product from Catalogue --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.barcode ? `(${p.barcode})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Packaging Unit Selection (Box / Packet / Piece) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">2. Packaging Unit Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(["Piece", "Packet", "Box"] as UnitType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setUnitType(type)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      unitType === type
                        ? "bg-brand-green text-black border-brand-green shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {type === "Piece" && <Layers className="w-3.5 h-3.5" />}
                    {type === "Packet" && <Package className="w-3.5 h-3.5" />}
                    {type === "Box" && <Box className="w-3.5 h-3.5" />}
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Quantity & Pack Multiplier */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quantity ({unitType}s)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 bg-white"
                />
              </div>
              {unitType !== "Piece" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Units per {unitType}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={boxSize}
                    onChange={(e) => setBoxSize(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 bg-white"
                  />
                </div>
              )}
            </div>

            {/* Total calculation indicator */}
            <div className="p-2.5 bg-slate-100 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Total Calculated Units:</span>
              <span className="font-extrabold text-brand-green text-sm">{totalPieces} Pieces</span>
            </div>

            {/* Step 4: Batch Number & Expiry */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Batch Number</label>
                <input
                  type="text"
                  placeholder="e.g. BATCH-2026"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 bg-white"
                />
              </div>
            </div>

            {/* Step 5: Supplier Selection & Purchase Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Supplier</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 bg-white"
                >
                  <option value="">Default Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-brand-green hover:bg-brand-green-dark text-white rounded-xl font-extrabold text-sm transition-colors shadow-md flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              {loading ? "Receiving Stock..." : `Save & Update ${totalPieces} Units`}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
