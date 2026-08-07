'use client';

import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  color?: string;
  height?: number;
  showShine?: boolean;
}

/** Animated horizontal progress bar with a soft shine sweep. */
export function ProgressBar({ value, className, color = 'hsl(var(--primary))', height = 10, showShine = true }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn('relative w-full overflow-hidden rounded-full bg-muted', className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${clamped}%`, background: color }}
      >
        {showShine && (
          <div className="relative h-full w-full overflow-hidden rounded-full">
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-white/30" />
          </div>
        )}
      </div>
    </div>
  );
}
