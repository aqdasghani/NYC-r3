import React from 'react';

interface AsciiBadgeProps {
  label?: string;
  status?: string;
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'info';
  prefix?: string;
  suffix?: string;
}

export default function AsciiBadge({ 
  label, 
  status,
  variant = 'default',
  prefix = '',
  suffix = ''
}: AsciiBadgeProps) {
  let displayLabel = label || status || 'UNKNOWN';
  let color = 'var(--text-primary)';
  let bg = 'transparent';
  
  if (status) {
    const s = status.toUpperCase();
    if (s === 'LIVE' || s === 'COMPLETED' || s === 'ONLINE') {
      variant = 'success';
    } else if (s === 'STDBY' || s === 'PENDING') {
      variant = 'warning';
    } else if (s === 'ERROR' || s === 'CRITICAL' || s === 'REFUNDED') {
      variant = 'danger';
    } else if (s === 'NEW') {
      variant = 'info';
    }
  }

  switch (variant) {
    case 'danger':
      color = 'var(--brand-red)';
      bg = 'var(--bg-tint-red)';
      break;
    case 'warning':
      color = 'var(--brand-orange)';
      bg = 'var(--bg-tint-orange)';
      break;
    case 'success':
      color = 'var(--brand-green)';
      bg = 'var(--bg-tint-green)';
      break;
    case 'info':
      color = 'var(--brand-blue)';
      bg = 'var(--bg-tint-blue)';
      break;
    default:
      bg = 'var(--bg-surface)';
      break;
  }

  return (
    <span style={{
      fontSize: '11px',
      fontWeight: 600,
      color: color,
      backgroundColor: bg,
      padding: '4px 8px',
      borderRadius: 'var(--radius-full)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      textTransform: 'uppercase',
      letterSpacing: '0.02em',
      boxShadow: 'var(--shadow-sm)'
    }}>
      {prefix && <span style={{ opacity: 0.7 }}>{prefix}</span>}
      {displayLabel}
      {suffix && <span style={{ opacity: 0.7 }}>{suffix}</span>}
    </span>
  );
}
