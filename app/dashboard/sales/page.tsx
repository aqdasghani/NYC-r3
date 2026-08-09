"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, ShoppingBag, Plus, Minus, Trash2, CreditCard, Banknote, Receipt, CheckCircle, Printer, X, Monitor, Camera, ScanLine } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

import { formatINR } from "@/lib/utils";
import { BarcodeScanner } from "@/components/scanner/BarcodeScanner";

// Types
interface Product {
  id: string;
  name: string;
  barcode: string;
  selling_price: number;
  gst_rate: number;
  stock: number;
}

interface CartItem {
  product: Product;
  quantity: number;
  discount_type?: "PERCENTAGE" | "FLAT";
  discount_value?: number;
}

export default function POSPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [searchLoading, setSearchLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  // Checkout state
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "UPI">("CASH");
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [successInvoice, setSuccessInvoice] = useState<any | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Global Barcode Scanner Buffer (for hardware USB scanners)
  const barcodeBuffer = useRef<string>("");
  const barcodeTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Global keydown listener for USB Hardware Scanners
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement === searchInputRef.current && e.key !== "Enter") {
        return;
      }
      if (document.activeElement?.tagName === "INPUT" && (document.activeElement as HTMLInputElement).type === "number") {
        return;
      }

      if (e.key === "Enter") {
        if (barcodeBuffer.current.length > 3) {
          e.preventDefault();
          handleBarcodeScanned(barcodeBuffer.current);
          barcodeBuffer.current = "";
        }
        return;
      }

      if (e.key.length === 1 && /^[a-zA-Z0-9-]$/.test(e.key)) {
        barcodeBuffer.current += e.key;
        if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
        barcodeTimeout.current = setTimeout(() => {
          barcodeBuffer.current = "";
        }, 50);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
      if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
    };
  }, []);

  const handleBarcodeScanned = async (code: string) => {
    setSearchLoading(true);
    try {
      const product = await apiFetch<Product>(`/api/inventory/barcode/${code}`);
      if (product) {
        addToCart(product);
        setSearchTerm("");
      }
    } catch (err: any) {
      alert(`Product not found for barcode: ${code}`);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced Search
  useEffect(() => {
    const fetchProducts = async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      try {
        const data = await apiFetch<{ items: Product[] }>(`/api/inventory/products?search=${encodeURIComponent(searchTerm)}&page_size=10`);
        setSearchResults(data.items || []);
      } catch (err) {
        console.error("Failed to search products", err);
      } finally {
        setSearchLoading(false);
      }
    };
    
    const timeoutId = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [{ product, quantity: 1 }, ...prev];
    });
  };

  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty < 1 || isNaN(newQty)) return;
    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: newQty } : i));
  };

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + (item.product.selling_price * item.quantity), 0);
  const estimatedTax = cart.reduce((acc, item) => acc + ((item.product.selling_price * item.quantity) * ((item.product.gst_rate || 0) / 100)), 0);
  const grandTotal = subtotal + estimatedTax;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    setCheckoutLoading(true);
    try {
      const payload = {
        payment_method: paymentMethod,
        amount_paid: amountPaid ? parseFloat(amountPaid) : grandTotal,
        items: cart.map(i => ({
          product_id: i.product.id,
          quantity: i.quantity,
          discount_type: i.discount_type,
          discount_value: i.discount_value
        }))
      };

      const data = await apiFetch<{ invoice: any }>("/api/pos/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      setSuccessInvoice(data.invoice);
      setCart([]);
      setAmountPaid("");
      setSearchTerm("");
    } catch (err: any) {
      alert("Checkout Error: " + (err.message || "Failed to process sale"));
    } finally {
      setCheckoutLoading(false);
    }
  };


  if (successInvoice) {
    return (
      <div className="h-full flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-500"></div>
          
          <div className="text-center mb-6 pt-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-1">Payment Successful</h2>
            <p className="text-slate-500">Invoice #{successInvoice.invoice_number}</p>
          </div>
          
          <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-500 font-medium">Grand Total</span>
              <span className="text-xl font-bold text-slate-800">{formatINR(successInvoice.grand_total)}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-slate-500">Amount Paid</span>
              <span className="text-slate-700 font-medium">{formatINR(successInvoice.amount_paid)}</span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button className="flex-1 bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
              <Printer className="w-5 h-5" />
              Print
            </button>
            <button 
              onClick={() => {
                setSuccessInvoice(null);
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
            >
              New Sale
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex gap-6">
      {/* LEFT: Search & Results / Scanner */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name or type barcode..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-10 py-4 bg-white border border-slate-200 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm transition-shadow"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            )}
            {searchLoading && (
              <div className="absolute right-12 top-1/2 -translate-y-1/2">
                <div className="animate-spin w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full" />
              </div>
            )}
          </div>
          
          <button
            onClick={() => setShowCamera(!showCamera)}
            className={`px-6 py-4 rounded-xl font-bold flex items-center gap-2 transition-colors ${
              showCamera ? "bg-red-500 text-white hover:bg-red-600" : "bg-[#063120] text-white hover:bg-[#063120]/90"
            }`}
          >
            {showCamera ? <ScanLine className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
            {showCamera ? "Hide Camera" : "Camera"}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 overflow-y-auto bg-slate-50/20 relative">
          {showCamera && (
            <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="bg-slate-900 rounded-2xl p-4 shadow-xl">
                <BarcodeScanner onScan={handleBarcodeScanned} />
              </div>
            </div>
          )}

          {!showCamera && searchResults.length === 0 && !searchTerm && (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-400">
              <Monitor className="w-16 h-16 mb-4 opacity-10" />
              <p className="font-medium text-slate-500 text-lg">Ready for Next Sale</p>
              <p className="text-sm mt-1 text-slate-400 text-center max-w-sm">
                Scan a barcode with your USB scanner,<br/>
                click "Camera" to scan with your phone,<br/>
                or type a product name to search.
              </p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
              {searchResults.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col text-left hover:border-emerald-500 hover:shadow-md transition-all group active:scale-95"
                >
                  <div className="text-sm font-semibold text-slate-800 line-clamp-2 mb-1 group-hover:text-emerald-700 transition-colors">
                    {product.name}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mb-3">{product.barcode || 'No Barcode'}</div>
                  
                  <div className="mt-auto flex items-end justify-between w-full">
                    <div className="text-lg font-bold text-slate-900">{formatINR(product.selling_price)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart & Checkout */}
      <div className="w-[400px] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-100 bg-[#063120] text-white flex justify-between items-center">
          <div className="flex items-center gap-2 font-semibold">
            <ShoppingBag className="w-5 h-5 text-[#0FA958]" />
            <span>Current Sale</span>
          </div>
          <div className="bg-white/10 text-white text-xs px-2.5 py-1 rounded-full font-bold">
            {cart.length} {cart.length === 1 ? 'Item' : 'Items'}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Receipt className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium text-slate-500">Cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-3 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex flex-col">
                    <div className="font-semibold text-sm text-slate-800 leading-tight">
                      {item.product.name}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-1">
                      {item.product.barcode}
                    </div>
                  </div>
                  <div className="font-bold text-slate-900 text-sm whitespace-nowrap">
                    {formatINR(item.product.selling_price * item.quantity)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono text-slate-500">
                    {formatINR(item.product.selling_price)}/pc
                  </div>
                  
                  {/* Quantity Controls */}
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                    <button 
                      onClick={() => {
                        if (item.quantity === 1) removeItem(item.product.id);
                        else updateQuantity(item.product.id, item.quantity - 1);
                      }}
                      className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-white hover:text-red-500 rounded-md transition-colors"
                    >
                      {item.quantity === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                      className="w-12 h-8 text-center text-sm font-bold text-slate-800 bg-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded-md hide-arrows"
                    />
                    <button 
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-white hover:text-emerald-600 rounded-md transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-white border-t border-slate-200 p-4 shrink-0 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
          <div className="space-y-2 mb-4 text-sm">
            <div className="border-t border-slate-200 pt-3 mt-1 flex justify-between items-end">
              <span className="text-slate-800 font-bold">Grand Total</span>
              <span className="text-3xl font-black text-emerald-600 tracking-tight">{formatINR(grandTotal)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setPaymentMethod("CASH")}
                className={`py-2 px-1 rounded-lg border flex flex-col items-center gap-1 transition-colors ${
                  paymentMethod === "CASH" ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold" : "border-slate-200 text-slate-600"
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Cash</span>
              </button>
              <button 
                onClick={() => setPaymentMethod("CARD")}
                className={`py-2 px-1 rounded-lg border flex flex-col items-center gap-1 transition-colors ${
                  paymentMethod === "CARD" ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold" : "border-slate-200 text-slate-600"
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Card</span>
              </button>
              <button 
                onClick={() => setPaymentMethod("UPI")}
                className={`py-2 px-1 rounded-lg border flex flex-col items-center gap-1 transition-colors ${
                  paymentMethod === "UPI" ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold" : "border-slate-200 text-slate-600"
                }`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2v-6h2v6zm-2-8h-2V7h2v2z"/>
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-wide">UPI</span>
              </button>
            </div>

            {paymentMethod === "CASH" && (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                <input 
                  type="number" 
                  placeholder="Amount Tendered" 
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800 placeholder:font-normal"
                />
              </div>
            )}

            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0 || checkoutLoading}
              className="w-full py-3.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {checkoutLoading ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>Charge {formatINR(grandTotal)}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
