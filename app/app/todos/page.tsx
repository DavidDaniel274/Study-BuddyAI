'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CheckSquare, Plus, Loader2, Check, Trash2, Flag, Repeat, GripVertical, Sparkles, Calendar,
} from 'lucide-react';
import { PaperCard, StickyNote, EmptyState, ProgressBar } from '@/components/paper';
import { BackButton } from '@/components/app/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { store, genId, nowIso, onDataChange } from '@/lib/store';
import { useUser } from '@/lib/user-context';
import { awardXp, logActivity, checkAchievements } from '@/lib/gamification';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Todo = {
  id: string; title: string; done: boolean; priority: string;
  scope: 'daily' | 'weekly'; due_date: string | null; recurring: boolean;
  order: number; created_at: string;
};

const priorityColor: Record<string, string> = { high: '#FF7F50', medium: '#FFB703', low: '#06D6A0' };
const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };

export default function TodoPage() {
  const { userId } = useUser();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newScope, setNewScope] = useState<'daily' | 'weekly'>('daily');
  const [newRecurring, setNewRecurring] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [aiSuggesting, setAiSuggesting] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await store.from('todos').select('*').eq('user_id', userId).order('order', { ascending: true });
    setTodos((data ?? []) as Todo[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); return onDataChange(() => load()); }, [load]);

  const add = async () => {
    if (!userId || !newTitle.trim()) return;
    const dueDate = newScope === 'daily'
      ? new Date().toISOString().slice(0, 10)
      : newDate || new Date().toISOString().slice(0, 10);
    const todo: Todo = {
      id: genId(), title: newTitle, done: false, priority: newPriority,
      scope: newScope, due_date: dueDate,
      recurring: newRecurring, order: todos.length, created_at: nowIso(),
    };
    await store.from('todos').insert({ ...todo, user_id: userId });

    // Auto-create calendar event for this to-do
    const eventId = genId();
    const startAt = new Date(`${dueDate}T09:00`).toISOString();
    const endAt = new Date(`${dueDate}T10:00`).toISOString();
    const eventColor = newPriority === 'high' ? '#FF7F50' : newPriority === 'medium' ? '#FFB703' : '#06D6A0';
    await store.from('calendar_events').insert({
      id: eventId, user_id: userId, title: `To-do: ${newTitle}`,
      type: 'study', start_at: startAt, end_at: endAt, color: eventColor,
      source: 'todo', source_id: todo.id, created_at: nowIso(),
    });

    setNewTitle('');
    setNewDate('');
    load();
    toast.success('Task added and scheduled on your calendar!');
  };

  const toggle = async (t: Todo) => {
    const done = !t.done;
    await store.from('todos').update({ done }).eq('id', t.id);
    setTodos((prev) => prev.map((x) => (x.id === t.id ? { ...x, done } : x)));
    if (done && userId) {
      await awardXp(userId, 8, `Completed to-do: ${t.title}`, 'todo');
      await logActivity(userId, 'completed task', t.title);
      const doneCount = todos.filter((x) => x.done).length + 1;
      await checkAchievements(userId, { todos: doneCount });
      toast.success('+8 XP!');
    }
  };

  const remove = async (id: string) => {
    // Remove linked calendar event(s)
    await store.from('calendar_events').delete().eq('source_id', id).eq('source', 'todo');
    await store.from('todos').delete().eq('id', id);
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const aiPrioritize = async () => {
    if (!userId) return;
    setAiSuggesting(true);
    // AI prioritization: sort by priority rank, then by scope (daily first), then undone first
    const sorted = [...todos].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const pr = priorityRank[a.priority] - priorityRank[b.priority];
      if (pr !== 0) return pr;
      if (a.scope !== b.scope) return a.scope === 'daily' ? -1 : 1;
      return 0;
    });
    for (let i = 0; i < sorted.length; i++) {
      await store.from('todos').update({ order: i }).eq('id', sorted[i].id);
    }
    setAiSuggesting(false);
    setTodos(sorted);
    toast.success('Tasks re-prioritized by AI!');
  };

  const daily = todos.filter((t) => t.scope === 'daily');
  const weekly = todos.filter((t) => t.scope === 'weekly');
  const doneCount = todos.filter((t) => t.done).length;

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <BackButton href="/app" />
      <div>
        <h1 className="font-display text-2xl font-extrabold">To-Do List</h1>
        <p className="text-sm text-muted-foreground">Daily and weekly tasks with AI prioritization.</p>
      </div>

      {/* Progress overview */}
      <PaperCard className="p-5" lift={false}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Overall progress</p>
            <p className="font-display text-2xl font-extrabold">{doneCount}/{todos.length}</p>
          </div>
          <Button variant="violet" size="sm" onClick={aiPrioritize} disabled={aiSuggesting || todos.length === 0}>
            {aiSuggesting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
            AI prioritize
          </Button>
        </div>
        <ProgressBar value={todos.length ? (doneCount / todos.length) * 100 : 0} className="mt-3" />
      </PaperCard>

      {/* Add task */}
      <PaperCard className="p-5" lift={false}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Add a task..." />
          </div>
          <div className="flex gap-2">
            <Select value={newPriority} onValueChange={setNewPriority}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={newScope} onValueChange={(v) => setNewScope(v as 'daily' | 'weekly')}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Today</SelectItem>
                <SelectItem value="weekly">This week</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-36"
            />
            <Button onClick={add} size="icon"><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={newRecurring} onChange={(e) => setNewRecurring(e.target.checked)} className="accent-primary" />
          <Repeat className="h-3.5 w-3.5" /> Recurring (resets daily)
        </label>
      </PaperCard>

      {/* Daily tasks */}
      <TodoSection title="Today" icon={Calendar} todos={daily} onToggle={toggle} onRemove={remove} tint="yellow" />

      {/* Weekly tasks */}
      <TodoSection title="This Week" icon={CheckSquare} todos={weekly} onToggle={toggle} onRemove={remove} tint="blue" />

      {todos.length === 0 && (
        <EmptyState icon={CheckSquare} title="No tasks yet" description="Add your first task above. Use AI prioritize to automatically sort by importance." />
      )}
    </div>
  );
}

function TodoSection({ title, icon: Icon, todos, onToggle, onRemove, tint }: {
  title: string; icon: any; todos: Todo[];
  onToggle: (t: Todo) => void; onRemove: (id: string) => void; tint: 'yellow' | 'blue';
}) {
  if (todos.length === 0) return null;
  const done = todos.filter((t) => t.done).length;
  return (
    <StickyNote tint={tint} rotate={tint === 'yellow' ? -1 : 1} tapeColor={tint === 'yellow' ? 'pink' : 'mint'}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Icon className="h-5 w-5" /> {title}</h2>
        <Badge variant="outline">{done}/{todos.length}</Badge>
      </div>
      <div className="space-y-2">
        {todos.map((t) => (
          <div key={t.id} className="group flex items-center gap-3 rounded-lg border border-black/5 bg-card/50 p-2.5">
            <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground/40" />
            <button onClick={() => onToggle(t)} className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all', t.done ? 'border-accent bg-accent text-white animate-check-pop' : 'border-muted-foreground/30 hover:border-primary')}>
              {t.done && <Check className="h-4 w-4" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className={cn('text-sm font-medium', t.done && 'text-muted-foreground line-through')}>{t.title}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-0.5" style={{ color: priorityColor[t.priority] }}><Flag className="h-3 w-3" /> {t.priority}</span>
                {t.recurring && <span className="flex items-center gap-0.5"><Repeat className="h-3 w-3" /> recurring</span>}
              </div>
            </div>
            <button onClick={() => onRemove(t.id)} className="opacity-0 transition-opacity group-hover:opacity-100">
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-error" />
            </button>
          </div>
        ))}
      </div>
    </StickyNote>
  );
}
