'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Sparkles, Loader2, Plus, Check, Trash2, Calendar, Flag,
  Target, AlertTriangle, ListChecks, Milestone as MilestoneIcon, TrendingUp,
} from 'lucide-react';
import { PaperCard, StickyNote, ProgressBar, EmptyState, Mascot } from '@/components/paper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { store, genId, nowIso } from '@/lib/store';
import { useUser } from '@/lib/user-context';
import { generateProjectPlan } from '@/lib/ai';
import { awardXp, logActivity, checkAchievements, pushNotification } from '@/lib/gamification';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Project = {
  id: string; title: string; description: string | null; type: string;
  priority: string; status: string; due_date: string | null; progress: number;
  members: string[]; ai_generated_plan: boolean;
};
type Task = { id: string; title: string; done: boolean; est_minutes: number; due_date: string | null; ai_generated: boolean };
type Milestone = { id: string; title: string; target_date: string | null; reached: boolean };

const priorityColor: Record<string, string> = { high: '#FF7F50', medium: '#FFB703', low: '#06D6A0' };

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { userId } = useUser();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [plan, setPlan] = useState<ReturnType<typeof generateProjectPlan> | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [{ data: p }, { data: t }, { data: m }] = await Promise.all([
      store.from('projects').select('*').eq('id', id).maybeSingle(),
      store.from('tasks').select('*').eq('project_id', id).order('created_at'),
      store.from('milestones').select('*').eq('project_id', id).order('target_date'),
    ]);
    setProject(p as Project | null);
    setTasks((t ?? []) as Task[]);
    setMilestones((m ?? []) as Milestone[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const toggleTask = async (task: Task) => {
    const done = !task.done;
    await store.from('tasks').update({ done }).eq('id', task.id);
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done } : t)));
    if (done && userId) {
      await awardXp(userId, 10, `Completed task: ${task.title}`, 'task');
      await logActivity(userId, 'completed task', task.title);
      toast.success('+10 XP!');
    }
    updateProgress();
  };

  const deleteTask = async (taskId: string) => {
    await store.from('tasks').delete().eq('id', taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const addTask = async () => {
    if (!newTask.trim() || !id) return;
    const { data } = await store.from('tasks').insert({ id: genId(), project_id: id, title: newTask, est_minutes: 30, created_at: nowIso() });
    if (data) setTasks((prev) => [...prev, data as Task]);
    setNewTask('');
  };

  const updateProgress = async () => {
    if (!project) return;
    const done = tasks.filter((t) => t.done).length;
    const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    await store.from('projects').update({ progress: pct, status: pct === 100 ? 'done' : pct > 0 ? 'in progress' : 'planning' }).eq('id', project.id);
    setProject({ ...project, progress: pct, status: pct === 100 ? 'done' : pct > 0 ? 'in progress' : 'planning' });
    if (pct === 100 && userId) {
      await awardXp(userId, 120, 'Project completed!', 'project');
      await logActivity(userId, 'completed project', project.title);
      await checkAchievements(userId, { projects: 1, xp_total: (await getTotalXpSafe(userId)) });
      await pushNotification(userId, 'achievement', 'Project complete!', `You finished ${project.title}. +120 XP`, '/app/projects');
      toast.success('Project complete! +120 XP');
    }
  };

  const toggleMilestone = async (m: Milestone) => {
    const reached = !m.reached;
    await store.from('milestones').update({ reached }).eq('id', m.id);
    setMilestones((prev) => prev.map((x) => (x.id === m.id ? { ...x, reached } : x)));
    if (reached && userId) {
      await awardXp(userId, 25, 'Milestone reached', 'milestone');
      toast.success('Milestone reached! +25 XP');
    }
  };

  const generateAiPlan = async () => {
    if (!project || !userId) return;
    setGenerating(true);
    const p = generateProjectPlan(project.title, project.description ?? '', project.due_date, project.type);
    setPlan(p);
    // persist AI tasks & milestones
    const taskRows = p.tasks.map((t) => ({
      project_id: project.id,
      title: t.title,
      est_minutes: t.est_minutes,
      due_date: t.due_offset_days ? new Date(Date.now() + t.due_offset_days * 86400000).toISOString() : null,
      ai_generated: true,
    }));
    const msRows = p.milestones.map((m) => ({
      project_id: project.id,
      title: m.title,
      target_date: new Date(Date.now() + m.target_offset_days * 86400000).toISOString(),
    }));
    await store.from('tasks').insert(taskRows.map((t) => ({ id: genId(), ...t, created_at: nowIso() })));
    await store.from('milestones').insert(msRows.map((m) => ({ id: genId(), ...m, created_at: nowIso() })));
    await store.from('projects').update({ ai_generated_plan: true }).eq('id', project.id);
    await awardXp(userId, 20, 'Generated AI plan', 'ai');
    await logActivity(userId, 'generated AI plan for', project.title);
    setGenerating(false);
    toast.success('AI plan generated! +20 XP');
    load();
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!project) return <EmptyState icon={AlertTriangle} title="Project not found" description="This project may have been deleted." action={<Button onClick={() => router.push('/app/projects')}>Back to projects</Button>} />;

  const doneTasks = tasks.filter((t) => t.done).length;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/app/projects')} className="mb-2">
        <ArrowLeft className="mr-1 h-4 w-4" /> All projects
      </Button>

      {/* Header card */}
      <PaperCard lift={false} className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: priorityColor[project.priority] }} />
              <Badge variant="outline" className="capitalize">{project.type}</Badge>
              <Badge variant="outline" className="capitalize">{project.status}</Badge>
            </div>
            <h1 className="mt-2 font-display text-2xl font-extrabold">{project.title}</h1>
            {project.description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{project.description}</p>}
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              {project.due_date && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Due {new Date(project.due_date).toLocaleDateString()}</span>}
              <span className="flex items-center gap-1"><Flag className="h-3.5 w-3.5" /> {project.priority} priority</span>
              <span className="flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" /> {doneTasks}/{tasks.length} tasks</span>
            </div>
          </div>
          <div className="w-full md:w-48">
            <div className="mb-1 flex justify-between text-xs"><span className="font-semibold">Progress</span><span className="text-muted-foreground">{project.progress}%</span></div>
            <ProgressBar value={project.progress} height={10} />
          </div>
        </div>
      </PaperCard>

      {/* AI plan generator */}
      {!project.ai_generated_plan && (
        <StickyNote tint="blue" rotate={-1} tapeColor="mint">
          <div className="flex items-start gap-3">
            <Mascot mood="think" size={56} float={false} />
            <div className="flex-1">
              <h3 className="font-display text-base font-bold">Let AI plan this for you</h3>
              <p className="mt-1 text-sm text-muted-foreground">I'll break "{project.title}" into tasks, milestones, and a weekly goal — with risk detection.</p>
              <Button className="mt-3" onClick={generateAiPlan} disabled={generating}>
                {generating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
                {generating ? 'Planning...' : 'Generate AI plan'}
              </Button>
            </div>
          </div>
        </StickyNote>
      )}

      {plan && (
        <PaperCard className="border-2 border-primary-violet/30 bg-primary-violet/5 p-6">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary-violet" />
            <h3 className="font-display text-lg font-bold">AI insights</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground">Predicted duration</p>
              <p className="font-display text-xl font-bold">~{plan.predicted_days} days</p>
            </div>
            <div className="rounded-xl bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground">Weekly goal</p>
              <p className="text-sm font-semibold">{plan.weekly_goal}</p>
            </div>
            <div className="rounded-xl bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground">Top risk</p>
              <p className="text-sm font-semibold text-coral">{plan.risk}</p>
            </div>
          </div>
          {plan.risks.length > 1 && (
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {plan.risks.slice(1).map((r, i) => <li key={i} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" /> {r}</li>)}
            </ul>
          )}
        </PaperCard>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Checklist */}
        <PaperCard className="p-6 lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-bold">Checklist</h2>
          <div className="mb-4 flex gap-2">
            <Input value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} placeholder="Add a task..." />
            <Button onClick={addTask} size="icon"><Plus className="h-4 w-4" /></Button>
          </div>
          {tasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No tasks yet. Add one or generate an AI plan.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <div key={t.id} className={cn('group flex items-center gap-3 rounded-xl border p-3 transition-all', t.done ? 'border-accent/30 bg-accent/5' : 'border-border/60 hover:shadow-paper-sm')}>
                  <button onClick={() => toggleTask(t)} className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all', t.done ? 'border-accent bg-accent text-white animate-check-pop' : 'border-muted-foreground/30 hover:border-primary')}>
                    {t.done && <Check className="h-4 w-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium', t.done && 'text-muted-foreground line-through')}>{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      ~{t.est_minutes} min{t.due_date && ` · due ${new Date(t.due_date).toLocaleDateString()}`}
                      {t.ai_generated && <span className="ml-1 text-primary-violet">· AI</span>}
                    </p>
                  </div>
                  <button onClick={() => deleteTask(t.id)} className="opacity-0 transition-opacity group-hover:opacity-100">
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-error" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </PaperCard>

        {/* Milestones */}
        <PaperCard className="p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><MilestoneIcon className="h-5 w-5 text-secondary" /> Milestones</h2>
          {milestones.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No milestones. Generate an AI plan to add some.</p>
          ) : (
            <div className="space-y-3">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-start gap-3">
                  <button onClick={() => toggleMilestone(m)} className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all', m.reached ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-muted-foreground/30 hover:border-secondary')}>
                    {m.reached && <Target className="h-3.5 w-3.5" />}
                  </button>
                  <div>
                    <p className={cn('text-sm font-semibold', m.reached && 'text-muted-foreground line-through')}>{m.title}</p>
                    {m.target_date && <p className="text-xs text-muted-foreground">{new Date(m.target_date).toLocaleDateString()}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PaperCard>
      </div>
    </div>
  );
}

async function getTotalXpSafe(uid: string) {
  const { data } = await store.from('xp_log').select('amount').eq('user_id', uid);
  return ((data ?? []) as { amount: number }[]).reduce((s: number, r) => s + (r.amount || 0), 0);
}
