'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface PaperCardProps extends HTMLAttributes<HTMLDivElement> {
  lift?: boolean;
  bordered?: boolean;
}

/** A clean paper card with soft layered shadow. Default surface for app content. */
export const PaperCard = forwardRef<HTMLDivElement, PaperCardProps>(
  ({ className, lift = true, bordered = true, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'paper-grain rounded-2xl bg-card text-card-foreground shadow-paper transition-all duration-300',
        bordered && 'border border-black/5',
        lift && 'hover:-translate-y-0.5 hover:shadow-paper-lg',
        className
      )}
      {...props}
    />
  )
);
PaperCard.displayName = 'PaperCard';
