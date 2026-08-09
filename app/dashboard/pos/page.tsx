'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Minus, ShoppingCart, CheckCircle, Printer, PlusCircle } from 'lucide-react';
import { getProducts, postSale } from '@/lib/api';
import type { ProductOut, Receipt } from '@/lib/backend-types';
import RoleGate from '@/components/layout/RoleGate';

type CartItem = {
  product: ProductOut;
  quantity: number;
};

export default function POSPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductOut[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchProducts(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchProducts = async (query: string) => {
    try {
      setLoading(true);
      const results = await getProducts(query);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: ProductOut) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            return { ...item, quantity: Math.max(0, item.quantity + delta) };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      setCheckoutLoading(true);
      setError(null);
      
      const items = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      }));
      
      const response = await postSale(items);
      setReceipt(response.receipt);
      setCart([]);
    } catch (err: any) {
      setError(err.message || 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const resetPOS = () => {
    setReceipt(null);
    setCart([]);
    setSearchQuery('');
    setError(null);
  };

  const subtotal = cart.reduce((sum, item) => sum + ((item.product.selling_price || 0) * item.quantity), 0);
  // Estimate GST if needed, but backend handles it accurately. We can just show subtotal or estimate.
  const gstEstimate = cart.reduce((sum, item) => {
    const price = item.product.selling_price || 0;
    const rate = item.product.gst_rate || 0;
    return sum + (price * rate / 100) * item.quantity;
  }, 0);
  const total = subtotal + gstEstimate;

  return (
    <RoleGate module="pos">
      <div className="max-w-lg mx-auto pb-24 h-full flex flex-col bg-bg-app min-h-[calc(100vh-4rem)]">
        <div className="p-4 border-b border-border-default bg-bg-surface sticky top-0 z-10">
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-brand-green" />
            POS — Billing
          </h1>
        </div>

        {receipt ? (
          <div className="p-4 flex-1 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4">
            <div className="glass-panel p-6 w-full text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Sale Complete</h2>
                <p className="text-text-secondary mt-1">Receipt #{receipt.receipt_no}</p>
              </div>
              
              <div className="text-left bg-bg-app rounded-lg p-4 space-y-2 text-sm max-h-[40vh] overflow-y-auto">
                {receipt.lines.map((line, i) => (
                  <div key={i} className="flex justify-between border-b border-border-default pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                    <div>
                      <p className="font-medium text-text-primary">{line.name}</p>
                      <p className="text-text-secondary">{line.qty} x ₹{line.unit_price.toFixed(2)}</p>
                    </div>
                    <p className="font-semibold text-text-primary">₹{line.line_total.toFixed(2)}</p>
                  </div>
                ))}
                <div className="pt-2 border-t-2 border-border-default border-dashed">
                  <div className="flex justify-between text-text-secondary">
                    <span>Subtotal</span>
                    <span>₹{receipt.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>GST</span>
                    <span>₹{receipt.gst_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg text-text-primary mt-2">
                    <span>Total</span>
                    <span>₹{receipt.grand_total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => window.print()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-border-default rounded-lg font-semibold text-text-primary hover:bg-bg-app min-h-[44px] transition-colors"
                >
                  <Printer className="w-5 h-5" />
                  Print
                </button>
                <button 
                  onClick={resetPOS}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-brand-green text-white rounded-lg font-bold hover:bg-brand-green-dark min-h-[44px] transition-colors"
                >
                  <PlusCircle className="w-5 h-5" />
                  New Sale
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-200">
                {error}
              </div>
            )}
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-text-muted" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search product by name or barcode..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border-default bg-bg-surface text-text-primary focus:ring-2 focus:ring-brand-green focus:border-transparent min-h-[44px] shadow-sm"
              />
              {loading && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <div className="w-4 h-4 border-2 border-brand-green border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-bg-surface border border-border-default rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="w-full text-left px-4 py-3 border-b border-border-default last:border-0 hover:bg-bg-app flex justify-between items-center group transition-colors min-h-[44px]"
                    >
                      <div>
                        <p className="font-semibold text-text-primary">{product.name}</p>
                        <p className="text-sm text-text-secondary">₹{product.selling_price?.toFixed(2) || '0.00'} • {product.category || 'No category'}</p>
                      </div>
                      <Plus className="w-5 h-5 text-brand-green opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col bg-bg-surface rounded-xl border border-border-default overflow-hidden shadow-sm">
              <div className="p-3 border-b border-border-default bg-bg-app font-semibold text-text-primary flex justify-between">
                <span>Current Order</span>
                <span className="text-brand-green">{cart.length} items</span>
              </div>
              
              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-text-muted p-8">
                  <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
                  <p>Scan or search to add items</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between bg-bg-app p-3 rounded-lg border border-border-default">
                      <div className="flex-1 pr-3">
                        <p className="font-semibold text-text-primary line-clamp-1">{item.product.name}</p>
                        <p className="text-brand-green font-bold">₹{((item.product.selling_price || 0) * item.quantity).toFixed(2)}</p>
                      </div>
                      
                      <div className="flex items-center gap-3 bg-bg-surface rounded-lg border border-border-default p-1 shadow-sm">
                        <button 
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-8 h-8 flex items-center justify-center rounded-md text-text-secondary hover:bg-bg-app active:bg-gray-200"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-6 text-center font-bold text-text-primary">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-md text-text-secondary hover:bg-bg-app active:bg-gray-200"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order Summary Pinned to bottom (above checkout button) */}
            <div className="bg-bg-surface p-4 rounded-xl border border-border-default shadow-sm space-y-2">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Est. GST</span>
                <span>₹{gstEstimate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-2xl text-text-primary pt-2 border-t border-border-default">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || checkoutLoading}
              className="w-full bg-brand-green hover:bg-brand-green-dark text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-brand-green/30 disabled:opacity-50 disabled:shadow-none transition-all flex justify-center items-center gap-2 min-h-[56px]"
            >
              {checkoutLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>Checkout • ₹{total.toFixed(2)}</>
              )}
            </button>
          </div>
        )}
      </div>
    </RoleGate>
  );
}
