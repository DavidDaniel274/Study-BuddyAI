'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Calendar as CalIcon, Plus, ChevronLeft, ChevronRight, Loader2, Trash2, Clock,
} from 'lucide-react';
import { PaperCard, EmptyState } from '@/components/paper';
import { BackButton } from '@/components/app/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { store, genId, nowIso } from '@/lib/store';
import { useUser } from '@/lib/user-context';
import { awardXp, logActivity } from '@/lib/gamification';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Event = { id: string; title: string; type: string; start_at: string; end_at: string; color: string };

const typeColors: Record<string, string> = {
  study: '#4F7DF3', revision: '#6C63FF', assignment: '#FF7F50', meeting: '#F78FB3', break: '#06D6A0',
};

const monthName = (d: Date) => d.toLocaleString('default', { month: 'long', year: 'numeric' });

export default function CalendarPage() {
  const { userId } = useUser();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'study', date: '', start: '09:00', end: '10:00' });

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await store.from('calendar_events').select('*').eq('user_id', userId).order('start_at');
    setEvents((data ?? []) as Event[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = lastDay.getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDay = (date: Date) =>
    events.filter((e) => new Date(e.start_at).toDateString() === date.toDateString());

  const today = new Date();
  const isToday = (d: Date) => d.toDateString() === today.toDateString();

  const create = async () => {
    if (!userId || !form.title.trim() || !form.date) return;
    const start = new Date(`${form.date}T${form.start}`);
    const end = new Date(`${form.date}T${form.end}`);
    const { error } = await store.from('calendar_events').insert({
      id: genId(), user_id: userId, title: form.title, type: form.type,
      start_at: start.toISOString(), end_at: end.toISOString(),
      color: typeColors[form.type] ?? '#4F7DF3', created_at: nowIso(),
    });
    if (error) { toast.error(error.message); return; }
    await awardXp(userId, 5, 'Scheduled an event', 'calendar');
    await logActivity(userId, 'scheduled', form.title);
    toast.success('Event added! +5 XP');
    setForm({ title: '', type: 'study', date: '', start: '09:00', end: '10:00' });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    await store.from('calendar_events').delete().eq('id', id);
    load();
  };

  return (
    <div className="space-y-6">
      <BackButton href="/app" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Calendar</h1>
          <p className="text-sm text-muted-foreground">Schedule study sessions, revision, assignments & meetings.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Add event</Button></DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle className="font-display text-xl">Add calendar event</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Biology revision" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="study">Study</SelectItem>
                      <SelectItem value="revision">Revision</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="break">Break</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start</Label>
                  <Input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>End</Label>
                  <Input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={create} disabled={!form.title.trim() || !form.date}>Add event</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : events.length === 0 && !loading ? null : null}

      <PaperCard className="p-6" lift={false}>
        {/* Month nav */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{monthName(cursor)}</h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Today</Button>
            <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="aspect-square rounded-lg bg-muted/20" />;
            const dayEvents = eventsByDay(date);
            return (
              <div
                key={i}
                className={cn(
                  'min-h-[80px] rounded-lg border p-1.5 transition-colors',
                  isToday(date) ? 'border-primary bg-primary/5' : 'border-border/40 hover:border-primary/30'
                )}
              >
                <div className={cn('mb-1 text-xs font-bold', isToday(date) ? 'text-primary' : 'text-muted-foreground')}>
                  {date.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <div key={e.id} className="group flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium" style={{ background: `${e.color}22`, color: e.color }}>
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: e.color }} />
                      <span className="truncate">{e.title}</span>
                      <button onClick={() => remove(e.id)} className="ml-auto hidden opacity-0 group-hover:block group-hover:opacity-100">
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                  {dayEvents.length > 3 && <p className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </PaperCard>

      {/* Upcoming list */}
      <PaperCard className="p-6">
        <h2 className="mb-4 font-display text-lg font-bold">Upcoming events</h2>
        {events.filter((e) => new Date(e.start_at) >= new Date()).length === 0 ? (
          <EmptyState icon={CalIcon} title="No upcoming events" description="Add a study session or revision block to get organised." mascotMood="think" />
        ) : (
          <div className="space-y-2">
            {events.filter((e) => new Date(e.start_at) >= new Date()).slice(0, 10).map((e) => (
              <div key={e.id} className="group flex items-center gap-3 rounded-xl border border-border/60 p-3">
                <span className="h-10 w-1.5 rounded-full" style={{ background: e.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{e.title}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                    <Clock className="h-3 w-3" /> {new Date(e.start_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · {new Date(e.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {e.type}
                  </p>
                </div>
                <button onClick={() => remove(e.id)} className="opacity-0 transition-opacity group-hover:opacity-100">
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-error" />
                </button>
              </div>
            ))}
          </div>
        )}
      </PaperCard>
    </div>
  );
}
