'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Mascot } from './mascot';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  mascotMood?: 'happy' | 'wave' | 'think' | 'celebrate' | 'sleep';
}

/** Friendly empty state with mascot and optional action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  mascotMood = 'wave',
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-paper-cream/40 px-6 py-12 text-center', className)}>
      <Mascot mood={mascotMood} size={88} className="mb-4" />
      {Icon && (
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
