'use client';
import React, { useEffect, useState } from 'react';
import styles from './AnimatedRing.module.css';

interface AnimatedRingProps {
  score: number;
  size?: number;
}

export default function AnimatedRing({ score, size = 160 }: AnimatedRingProps) {
  const [offset, setOffset] = useState(440);
  const strokeWidth = size * 0.075;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    // Calculate stroke-dashoffset based on score (0-100)
    const progressOffset = ((100 - score) / 100) * circumference;
    // Animate after mount
    setTimeout(() => {
      setOffset(progressOffset);
    }, 100);
  }, [score, circumference]);

  return (
    <div className={styles.container} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className={styles.bgCircle}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          className={styles.progressCircle}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className={styles.textContainer}>
        <span className={styles.score}>{score}</span>
        <span className={styles.max}>/100</span>
      </div>
    </div>
  );
}
