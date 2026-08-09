import React from 'react';
import clsx from 'clsx';
import styles from './ActionBadge.module.css';

interface ActionBadgeProps {
  status: 'critical' | 'warning' | 'upcoming' | 'safe';
  label: string;
}

export default function ActionBadge({ status, label }: ActionBadgeProps) {
  return (
    <span className={clsx(styles.badge, styles[status])}>
      {label}
    </span>
  );
}
