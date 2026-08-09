import React from 'react';
import { Check, X } from 'lucide-react';

export default function ComparisonTable() {
  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-card)'
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', background: '#F8FAFC', borderBottom: '1px solid var(--border-default)' }}>
        <div style={{ padding: '24px', fontWeight: 600, color: 'var(--text-secondary)' }}>Feature</div>
        <div style={{ padding: '24px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', borderLeft: '1px solid var(--border-default)' }}>Traditional (Tally/Notebook)</div>
        <div style={{ padding: '24px', fontWeight: 700, color: 'var(--brand-green)', textAlign: 'center', borderLeft: '1px solid var(--border-default)', background: '#F0FDF4' }}>Green Quant AI</div>
      </div>

      {[
        { name: 'Inventory Tracking', trad: true, green: true },
        { name: 'Batch & Expiry Date OCR', trad: false, green: true },
        { name: 'FEFO Checkout Prioritization', trad: false, green: true },
        { name: 'AI Discount Recommendations', trad: false, green: true },
        { name: 'Automated Inter-store Transfers', trad: false, green: true },
        { name: 'Sustainability Tracking (Green Score)', trad: false, green: true },
      ].map((row, i) => (
        <div key={i} style={{ 
          display: 'grid', 
          gridTemplateColumns: '2fr 1fr 1fr', 
          borderBottom: i === 5 ? 'none' : '1px solid var(--border-default)',
          background: i % 2 === 0 ? 'white' : '#F8FAFC'
        }}>
          <div style={{ padding: '20px 24px', color: 'var(--text-primary)', fontWeight: 500 }}>{row.name}</div>
          
          <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', borderLeft: '1px solid var(--border-default)' }}>
            {row.trad ? <Check color="#94A3B8" /> : <X color="#EF4444" opacity={0.5} />}
          </div>
          
          <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', borderLeft: '1px solid var(--border-default)', background: 'rgba(16, 185, 129, 0.02)' }}>
            {row.green ? <Check color="#10B981" /> : <X color="#EF4444" />}
          </div>
        </div>
      ))}
    </div>
  );
}
