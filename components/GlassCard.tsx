import React from 'react';
import clsx from 'clsx';
import styles from './GlassCard.module.css';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'green' | 'critical' | 'warning' | 'info' | 'purple' | 'none';
}

export default function GlassCard({ children, className, glowColor = 'none' }: GlassCardProps) {
  return (
    <div 
      className={clsx(
        styles.glassCard,
        glowColor !== 'none' && styles[`glow-${glowColor}`],
        className
      )}
    >
      <div className={styles.highlight} />
      {children}
    </div>
  );
}
