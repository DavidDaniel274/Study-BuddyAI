'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

const ACCENTS = {
  yellow: 'bg-secondary',
  blue: 'bg-primary/90',
  mint: 'bg-accent/80',
  pink: 'bg-pink/80',
  coral: 'bg-coral/80',
  violet: 'bg-primary-violet/80',
} as const;

type TapeColor = keyof typeof ACCENTS;

interface WashiTapeProps extends HTMLAttributes<HTMLDivElement> {
  color?: TapeColor;
  rotate?: number;
  width?: number;
}

/** Decorative washi tape strip, rotated and semi-transparent. */
export const WashiTape = forwardRef<HTMLDivElement, WashiTapeProps>(
  ({ className, color = 'yellow', rotate = -6, width = 96, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'pointer-events-none absolute h-6 opacity-80 mix-blend-multiply dark:mix-blend-screen',
        ACCENTS[color],
        className
      )}
      style={{
        transform: `rotate(${rotate}deg)`,
        width,
        backgroundImage:
          'repeating-linear-gradient(90deg, rgba(255,255,255,0.25) 0 6px, transparent 6px 12px)',
        ...style,
      }}
      {...props}
    />
  )
);
WashiTape.displayName = 'WashiTape';
