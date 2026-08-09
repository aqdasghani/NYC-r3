import React from 'react';
import AsciiBadge from './AsciiBadge';

export default function TemplatePage({ title }: { title: string }) {
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--border-default)', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '32px', margin: 0 }}>{title}</h1>
        <AsciiBadge label="STDBY" variant="warning" />
      </div>

      <div className="card" style={{ 
        minHeight: '400px', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.02) 10px, rgba(0,0,0,0.02) 20px)',
        border: '1px dashed var(--border-default)'
      }}>
        <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--text-secondary)' }}>MODULE UNINITIALIZED</h2>
        <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          &gt; AWAITING DATA FEED FOR {title.toUpperCase()}...
        </p>
      </div>
    </div>
  );
}
