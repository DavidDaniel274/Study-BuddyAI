'use client';

import { cn } from '@/lib/utils';

interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  className?: string;
  label?: string;
  animate?: boolean;
}

/** Circular progress ring with animated stroke and optional center label. */
export function ProgressRing({
  value,
  size = 80,
  strokeWidth = 8,
  color = '#4F7DF3',
  trackColor = 'hsl(var(--border))',
  className,
  label,
  animate = true,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={animate ? { transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)' } : undefined}
        />
      </svg>
      {label && (
        <span className="absolute text-sm font-bold text-foreground">{label}</span>
      )}
    </div>
  );
}
