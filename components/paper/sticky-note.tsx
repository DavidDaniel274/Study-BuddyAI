'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { WashiTape } from './washi-tape';

const TINTS = {
  white: 'bg-paper text-card-foreground',
  cream: 'bg-paper-cream text-card-foreground',
  yellow: 'bg-secondary/70 text-secondary-foreground',
  blue: 'bg-primary/10 text-card-foreground',
  mint: 'bg-accent/10 text-card-foreground',
  pink: 'bg-pink/15 text-card-foreground',
  coral: 'bg-coral/15 text-card-foreground',
  violet: 'bg-primary-violet/10 text-card-foreground',
} as const;

type Tint = keyof typeof TINTS;

interface StickyNoteProps extends HTMLAttributes<HTMLDivElement> {
  tint?: Tint;
  rotate?: number;
  tape?: boolean;
  tapeColor?: Parameters<typeof WashiTape>[0]['color'];
  lift?: boolean;
}

/** A paper sticky-note card with optional washi tape and hover lift. */
export const StickyNote = forwardRef<HTMLDivElement, StickyNoteProps>(
  (
    { className, tint = 'yellow', rotate = 0, tape = true, tapeColor = 'yellow', lift = true, style, children, ...props },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(
        'paper-grain relative rounded-xl border border-black/5 p-5 shadow-sticky transition-all duration-300',
        TINTS[tint],
        lift && 'hover:-translate-y-1 hover:shadow-paper-lg',
        className
      )}
      style={{ transform: `rotate(${rotate}deg)`, ...style }}
      {...props}
    >
      {tape && (
        <WashiTape
          color={tapeColor}
          rotate={-8}
          width={84}
          className="-top-3 left-1/2 -translate-x-1/2"
        />
      )}
      {children}
    </div>
  )
);
StickyNote.displayName = 'StickyNote';
