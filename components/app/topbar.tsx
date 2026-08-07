'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Menu, Bell, Flame, Sun, Moon, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/lib/theme-context';
import { useUser } from '@/lib/user-context';
import { store } from '@/lib/store';
import { cn } from '@/lib/utils';
import { getTotalXp, levelFromXp, computeStreak } from '@/lib/gamification';

type Notif = { id: string; type: string; title: string; body: string | null; read: boolean; link: string | null; created_at: string };

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const { userId } = useUser();
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [openNotif, setOpenNotif] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    getTotalXp(userId).then(setXp);
    (async () => {
      const { data: sessions } = await store
        .from('study_sessions')
        .select('started_at')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(60);
      setStreak(computeStreak((sessions ?? []) as { started_at: string }[]));
      const { data: n } = await store
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(12);
      setNotifs((n ?? []) as Notif[]);
    })();
  }, [userId]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpenNotif(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const { level } = levelFromXp(xp);
  const unread = notifs.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!userId) return;
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    await store.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md md:px-6">
      {onMenu && <button onClick={onMenu} className="md:hidden"><Menu className="h-5 w-5" /></button>}

      <div className="flex flex-1 items-center gap-2">
        <div className="hidden items-center gap-2 rounded-full bg-secondary/70 px-3 py-1 text-xs font-bold text-secondary-foreground shadow-paper-sm sm:flex">
          <Flame className="h-3.5 w-3.5 text-coral" /> {streak} day streak
        </div>
        <div className="hidden items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary shadow-paper-sm sm:flex">
          <Sparkles className="h-3.5 w-3.5" /> Lv {level} · {xp} XP
        </div>
      </div>

      <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </Button>

      <div className="relative" ref={popRef}>
        <Button variant="ghost" size="icon" onClick={() => setOpenNotif((o) => !o)} aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </Button>
        {openNotif && (
          <div className="absolute right-0 top-12 w-80 overflow-hidden rounded-2xl border border-border bg-paper shadow-paper-lg">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <span className="font-display text-sm font-bold">Notifications</span>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs font-semibold text-primary hover:underline">Mark all read</button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifs.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
              ) : (
                notifs.map((n) => (
                  <Link
                    key={n.id}
                    href={n.link ?? '#'}
                    onClick={() => setOpenNotif(false)}
                    className={cn('flex gap-3 px-4 py-3 transition-colors hover:bg-primary/5', !n.read && 'bg-primary/5')}
                  >
                    <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-muted' : 'bg-primary')} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{n.title}</p>
                      {n.body && <p className="truncate text-xs text-muted-foreground">{n.body}</p>}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
