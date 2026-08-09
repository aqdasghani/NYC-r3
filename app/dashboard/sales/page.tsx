'use client';

import React, { useState } from 'react';
import styles from './page.module.css';
import AsciiBadge from '@/components/ui/AsciiBadge';
import { Download, RefreshCcw, ShoppingCart, ScanBarcode, Plus, Minus, CreditCard } from 'lucide-react';
import { useGreenShop, Product } from '@/components/GlobalState';

export default function SalesPage() {
  const { products, recordSale } = useGreenShop();
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [txns, setTxns] = useState<any[]>([
    { id: 'TXN-8842', time: '14:23:05', items: 12, total: '$145.20', status: 'COMPLETED' },
    { id: 'TXN-8843', time: '14:25:12', items: 3, total: '$24.50', status: 'COMPLETED' }
  ]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return alert('Out of stock!');
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQ = item.quantity + delta;
          if (newQ <= 0) return { ...item, quantity: 0 };
          if (newQ > item.product.stock) return item;
          return { ...item, quantity: newQ };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const cartTotal = cart.reduce((acc, item) => {
    const price = parseFloat(item.product.price.replace('$', ''));
    return acc + (price * item.quantity);
  }, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    // Process sale in global state
    cart.forEach(item => {
      recordSale(item.product.id, item.quantity);
    });

    // Add to local txns
    const newTxn = {
      id: `TXN-${Math.floor(Math.random() * 9000) + 1000}`,
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      items: cart.reduce((acc, item) => acc + item.quantity, 0),
      total: `$${cartTotal.toFixed(2)}`,
      status: 'COMPLETED'
    };

    setTxns(prev => [newTxn, ...prev]);
    setCart([]);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Point of Sale</h1>
        <div className={styles.actions}>
          <button className={styles.btnAction}><RefreshCcw size={14} style={{ marginRight: '6px' }} /> Sync</button>
          <button className={styles.btnAction}><Download size={14} style={{ marginRight: '6px' }} /> Export Z-Report</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', flex: 1, minHeight: '600px' }}>
        
        {/* Left: Product Scanner/Grid */}
        <div className={styles.card} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 className={styles.cardTitle}>Quick Add</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input type="text" placeholder="Scan Barcode..." style={{ padding: '8px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-default)', outline: 'none' }} />
              <button className={styles.btnAction} style={{ borderColor: 'var(--brand-blue)', color: 'var(--brand-blue)' }}><ScanBarcode size={14} style={{ marginRight: '6px' }}/> Simulate Scan</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {products.map(p => (
              <div key={p.id} onClick={() => addToCart(p)} style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '16px', cursor: 'pointer', transition: 'all 0.2s', opacity: p.stock === 0 ? 0.5 : 1 }}>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>{p.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, color: 'var(--brand-green)' }}>{p.price}</span>
                  <span style={{ fontSize: '11px', color: p.stock === 0 ? 'var(--brand-red)' : 'var(--text-secondary)' }}>
                    {p.stock === 0 ? 'Out of stock' : `${p.stock} in stock`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Cart */}
        <div className={styles.card} style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-app)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <ShoppingCart size={18} />
            <h3 className={styles.cardTitle} style={{ margin: 0 }}>Current Cart</h3>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>Cart is empty</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {cart.map(item => (
                  <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.product.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.product.price}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button onClick={() => updateQuantity(item.product.id, -1)} style={{ border: 'none', background: 'var(--bg-app)', width: '24px', height: '24px', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={12} /></button>
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, 1)} style={{ border: 'none', background: 'var(--bg-app)', width: '24px', height: '24px', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '20px', marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span>Subtotal</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span>Tax (8%)</span>
              <span>${(cartTotal * 0.08).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '18px', fontWeight: 800 }}>
              <span>Total</span>
              <span>${(cartTotal * 1.08).toFixed(2)}</span>
            </div>
            
            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className={`${styles.btnAction} ${styles.btnPrimary}`} 
              style={{ width: '100%', padding: '16px', fontSize: '14px', opacity: cart.length === 0 ? 0.5 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} /> Complete Checkout
            </button>
          </div>
        </div>

      </div>

      <div className={styles.card} style={{ marginTop: '24px' }}>
        <h3 className={styles.cardTitle}>Recent Transactions</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>TXN ID</th>
                <th>Time (UTC)</th>
                <th>Items</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {txns.map(txn => (
                <tr key={txn.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{txn.id}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{txn.time}</td>
                  <td>{txn.items}</td>
                  <td style={{ fontWeight: 700, textAlign: 'right' }}>{txn.total}</td>
                  <td>
                    <AsciiBadge status={txn.status === 'COMPLETED' ? 'LIVE' : (txn.status === 'PENDING' ? 'STDBY' : 'ERROR')} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
