'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, KanbanSquare, Brain, CalendarClock, GraduationCap,
  Layers, BarChart3, Settings, X, CheckSquare, Target, Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/lib/user-context';
import { Mascot } from '@/components/paper';
import { Button } from '@/components/ui/button';
import { getTotalXp, levelFromXp } from '@/lib/gamification';

const nav = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/projects', label: 'Projects', icon: KanbanSquare },
  { href: '/app/todos', label: 'To-Do List', icon: CheckSquare },
  { href: '/app/goals', label: 'Goals', icon: Target },
  { href: '/app/assistant', label: 'AI Assistant', icon: Brain },
  { href: '/app/calendar', label: 'Calendar', icon: CalendarClock },
  { href: '/app/quizzes', label: 'Quizzes', icon: GraduationCap },
  { href: '/app/flashcards', label: 'Flashcards', icon: Layers },
  { href: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { userId, profile } = useUser();
  const [xp, setXp] = useState(0);

  useEffect(() => {
    if (userId) getTotalXp(userId).then(setXp);
  }, [userId]);

  const { level, intoLevel, needed, progress } = levelFromXp(xp);

  return (
    <>
      {open && onClose && <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border/60 bg-paper-cream transition-transform md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* logo */}
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/app" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-paper-sm">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-extrabold">StudyFlow</span>
          </Link>
          {onClose && <button onClick={onClose} className="md:hidden"><X className="h-5 w-5" /></button>}
        </div>

        {/* level card */}
        <div className="mx-3 mb-2 rounded-xl bg-primary p-4 text-primary-foreground shadow-paper">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide opacity-90">Level {level}</span>
            <Mascot mood="happy" size={32} float={false} />
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-secondary transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] opacity-80">{intoLevel} / {needed} XP to level {level + 1}</p>
        </div>

        {/* nav */}
        <nav className="flex-1 space-y-1 px-3 py-2">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== '/app' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose?.()}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
                  active
                    ? 'bg-primary text-primary-foreground shadow-paper-sm'
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                )}
              >
                <item.icon className={cn('h-5 w-5 transition-transform group-hover:scale-110', active && 'scale-110')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* user + back to home */}
        <div className="border-t border-border/60 p-3">
          <div className="mb-2 flex items-center gap-2 rounded-xl px-2 py-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-violet font-bold text-white">
              {(profile?.display_name || 'S')[0]?.toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{profile?.display_name || 'Student'}</p>
              <p className="truncate text-xs text-muted-foreground">Local account</p>
            </div>
          </div>
          <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary">
            <Home className="h-5 w-5" /> Back to home
          </Link>
        </div>
      </aside>
    </>
  );
}
