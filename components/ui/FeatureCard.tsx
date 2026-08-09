'use client';

import React from 'react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color?: 'green' | 'blue' | 'orange' | 'red';
}

const colorMap = {
  green: { bg: '#F0FDF4', text: '#10B981', border: '#A7F3D0' },
  blue: { bg: '#EFF6FF', text: '#3B82F6', border: '#BFDBFE' },
  orange: { bg: '#FFFBEB', text: '#F59E0B', border: '#FDE68A' },
  red: { bg: '#FEF2F2', text: '#EF4444', border: '#FECACA' }
};

export default function FeatureCard({ icon, title, description, color = 'green' }: FeatureCardProps) {
  const theme = colorMap[color];

  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      padding: '32px',
      boxShadow: 'var(--shadow-sm)',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = 'var(--shadow-card)';
      e.currentTarget.style.borderColor = theme.border;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      e.currentTarget.style.borderColor = 'var(--border-default)';
    }}
    >
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: theme.bg,
        color: theme.text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px'
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
        {title}
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.6, flex: 1 }}>
        {description}
      </p>
    </div>
  );
}
