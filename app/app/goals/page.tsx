'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Target, Plus, Loader2, Trash2, Check, Trophy, Calendar, Sparkles, TrendingUp,
} from 'lucide-react';
import { PaperCard, StickyNote, EmptyState, ProgressBar, ProgressRing, Mascot, Confetti } from '@/components/paper';
import { BackButton } from '@/components/app/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { store, genId, nowIso, onDataChange } from '@/lib/store';
import { useUser } from '@/lib/user-context';
import { awardXp, logActivity, checkAchievements } from '@/lib/gamification';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Goal = {
  id: string; title: string; type: string; target: number; current: number;
  unit: string; deadline: string | null; completed: boolean; created_at: string;
};

const typeColor: Record<string, string> = {
  daily: '#4F7DF3', weekly: '#06D6A0', monthly: '#6C63FF', semester: '#FF7F50', custom: '#F78FB3',
};
const typeIcon: Record<string, any> = { daily: Calendar, weekly: TrendingUp, monthly: Target, semester: Trophy, custom: Sparkles };

export default function GoalsPage() {
  const { userId } = useUser();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [form, setForm] = useState({ title: '', type: 'weekly', target: '10', unit: 'tasks', deadline: '' });

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await store.from('goals').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setGoals((data ?? []) as Goal[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); return onDataChange(() => load()); }, [load]);

  const create = async () => {
    if (!userId || !form.title.trim()) return;
    await store.from('goals').insert({
      id: genId(), user_id: userId, title: form.title, type: form.type,
      target: parseInt(form.target, 10) || 1, current: 0, unit: form.unit,
      deadline: form.deadline || null, completed: false, created_at: nowIso(),
    });
    await awardXp(userId, 10, 'Created a goal', 'goal');
    toast.success('Goal created! +10 XP');
    setForm({ title: '', type: 'weekly', target: '10', unit: 'tasks', deadline: '' });
    setOpen(false);
    load();
  };

  const increment = async (g: Goal) => {
    const current = Math.min(g.current + 1, g.target);
    const completed = current >= g.target;
    await store.from('goals').update({ current, completed }).eq('id', g.id);
    setGoals((prev) => prev.map((x) => (x.id === g.id ? { ...x, current, completed } : x)));
    if (completed && userId && !g.completed) {
      await awardXp(userId, 50, `Goal completed: ${g.title}`, 'goal');
      await logActivity(userId, 'completed goal', g.title);
      const doneGoals = goals.filter((x) => x.completed).length + 1;
      await checkAchievements(userId, { goals: doneGoals });
      setConfetti((c) => c + 1);
      toast.success('Goal completed! +50 XP');
    } else if (userId) {
      await awardXp(userId, 3, 'Goal progress', 'goal');
    }
  };

  const remove = async (id: string) => {
    await store.from('goals').delete().eq('id', id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const grouped = {
    daily: goals.filter((g) => g.type === 'daily'),
    weekly: goals.filter((g) => g.type === 'weekly'),
    monthly: goals.filter((g) => g.type === 'monthly'),
    semester: goals.filter((g) => g.type === 'semester'),
    custom: goals.filter((g) => g.type === 'custom'),
  };
  const completedCount = goals.filter((g) => g.completed).length;

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <BackButton href="/app" />
      <Confetti fire={confetti} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Goals</h1>
          <p className="text-sm text-muted-foreground">Daily, weekly, monthly, semester & custom learning goals.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> New goal</Button></DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle className="font-display text-xl">Create a goal</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Goal title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Study 10 hours this week" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="semester">Semester</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Unit</Label>
                  <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="hours, tasks, pages" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Target</Label>
                  <Input type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Deadline (optional)</Label>
                  <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={create} disabled={!form.title.trim()}>Create goal</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <PaperCard className="flex items-center gap-4 p-5" lift={false}>
          <ProgressRing value={goals.length ? (completedCount / goals.length) * 100 : 0} size={70} color="#06D6A0" label={`${goals.length ? Math.round((completedCount / goals.length) * 100) : 0}%`} />
          <div>
            <p className="text-sm text-muted-foreground">Completion rate</p>
            <p className="font-display text-xl font-bold">{completedCount}/{goals.length} done</p>
          </div>
        </PaperCard>
        <PaperCard className="flex items-center gap-4 p-5" lift={false}>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Active goals</p>
            <p className="font-display text-xl font-bold">{goals.length - completedCount}</p>
          </div>
        </PaperCard>
        <PaperCard className="flex items-center gap-4 p-5" lift={false}>
          <Mascot mood="celebrate" size={50} float={false} />
          <div>
            <p className="text-sm text-muted-foreground">Keep going!</p>
            <p className="font-display text-xl font-bold">{completedCount} completed</p>
          </div>
        </PaperCard>
      </div>

      {goals.length === 0 ? (
        <EmptyState icon={Target} title="No goals yet" description="Create your first goal — daily, weekly, monthly, semester, or custom. Track progress and earn XP for completing them." action={<Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Create a goal</Button>} />
      ) : (
        <div className="space-y-6">
          {(Object.entries(grouped) as [string, Goal[]][]).map(([type, typeGoals]) =>
            typeGoals.length === 0 ? null : (
              <div key={type}>
                <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold capitalize">
                  {(() => { const Icon = typeIcon[type] ?? Target; return <Icon className="h-5 w-5" style={{ color: typeColor[type] }} />; })()}
                  {type} goals
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {typeGoals.map((g, i) => (
                    <StickyNote key={g.id} tint={i % 3 === 0 ? 'mint' : i % 3 === 1 ? 'blue' : 'yellow'} rotate={i % 2 ? 1 : -1}>
                      <div className="flex items-start justify-between">
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-bold capitalize text-white" style={{ background: typeColor[g.type] }}>{g.type}</span>
                        <button onClick={() => remove(g.id)} className="opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-error" /></button>
                      </div>
                      <h3 className="mt-2 font-display text-base font-bold leading-snug">{g.title}</h3>
                      {g.deadline && <p className="mt-1 text-xs text-muted-foreground">By {new Date(g.deadline).toLocaleDateString()}</p>}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold">{g.current} / {g.target} {g.unit}</span>
                          <span className="text-muted-foreground">{Math.round((g.current / g.target) * 100)}%</span>
                        </div>
                        <ProgressBar value={(g.current / g.target) * 100} height={8} color={typeColor[g.type]} showShine={false} />
                      </div>
                      <Button
                        size="sm"
                        className="mt-3 w-full"
                        variant={g.completed ? 'accent' : 'outline'}
                        onClick={() => !g.completed && increment(g)}
                        disabled={g.completed}
                      >
                        {g.completed ? <><Check className="mr-1 h-3.5 w-3.5" /> Completed!</> : 'Log progress +1'}
                      </Button>
                    </StickyNote>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
