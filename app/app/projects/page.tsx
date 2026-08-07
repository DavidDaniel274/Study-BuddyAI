'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, KanbanSquare, Calendar as CalIcon, Users, TrendingUp, Loader2, Sparkles, ArrowRight,
  Clock, Trash2, Check, Wand2,
} from 'lucide-react';
import { PaperCard, StickyNote, ProgressBar, EmptyState, Mascot } from '@/components/paper';
import { BackButton } from '@/components/app/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { store, genId, nowIso } from '@/lib/store';
import { useUser } from '@/lib/user-context';
import { awardXp, logActivity, pushNotification } from '@/lib/gamification';
import { generateSchedule, generateProjectPlan, ScheduledTask } from '@/lib/ai';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Project = {
  id: string; title: string; description: string | null; type: string;
  priority: string; status: string; due_date: string | null; progress: number; members: string[];
};

const typeColor: Record<string, string> = {
  assignment: '#4F7DF3', group: '#06D6A0', research: '#6C63FF', capstone: '#FF7F50', personal: '#F78FB3',
};
const priorityColor: Record<string, string> = { high: '#FF7F50', medium: '#FFB703', low: '#06D6A0' };
const eventTypeColor: Record<string, string> = {
  study: '#4F7DF3', revision: '#6C63FF', assignment: '#FF7F50', meeting: '#F78FB3', break: '#06D6A0',
};

export default function ProjectsPage() {
  const { userId } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'assignment', priority: 'medium', due_date: '' });

  // AI schedule state
  const [scheduling, setScheduling] = useState(false);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [scheduleGenerated, setScheduleGenerated] = useState(false);
  const [preferredTime, setPreferredTime] = useState('09:00');
  const [planPreview, setPlanPreview] = useState<{ weekly_goal: string; risk: string; risks: string[]; milestones: { title: string; target_offset_days: number }[]; predicted_days: number } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await store.from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setProjects((data ?? []) as Project[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm({ title: '', description: '', type: 'assignment', priority: 'medium', due_date: '' });
    setScheduledTasks([]);
    setScheduleGenerated(false);
    setPreferredTime('09:00');
    setPlanPreview(null);
  };

  const generateAiSchedule = async () => {
    if (!form.title.trim()) return;
    setScheduling(true);
    await new Promise((r) => setTimeout(r, 800));
    const plan = generateProjectPlan(form.title, form.description, form.due_date || null, form.type);
    const tasks = generateSchedule(form.title, form.description, form.due_date || null, form.type, preferredTime);
    setScheduledTasks(tasks);
    setPlanPreview({ weekly_goal: plan.weekly_goal, risk: plan.risk, risks: plan.risks, milestones: plan.milestones, predicted_days: plan.predicted_days });
    setScheduleGenerated(true);
    setScheduling(false);
  };

  const updateTask = (idx: number, field: keyof ScheduledTask, value: string) => {
    setScheduledTasks((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));
  };

  const deleteProject = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { data: tasks } = await store.from('tasks').select('id').eq('project_id', deleteId);
    const taskIds = (tasks ?? []).map((t: any) => t.id);
    if (taskIds.length > 0) {
      await store.from('calendar_events').delete().in('task_id', taskIds);
      await store.from('tasks').delete().in('id', taskIds);
    }
    await store.from('projects').delete().eq('id', deleteId);
    setDeleting(false);
    setDeleteId(null);
    toast.success('Project deleted');
    load();
  };

  const removeTask = (idx: number) => {
    setScheduledTasks((prev) => prev.filter((_, i) => i !== idx));
  };

  const addTask = () => {
    const lastDate = scheduledTasks.length > 0 ? scheduledTasks[scheduledTasks.length - 1].date : form.due_date || new Date().toISOString().slice(0, 10);
    setScheduledTasks((prev) => [...prev, { title: 'New task', est_minutes: 30, date: lastDate, start_time: preferredTime, end_time: `${preferredTime.split(':')[0]}:${String(parseInt(preferredTime.split(':')[1] || '0') + 30).padStart(2, '0')}` }]);
  };

  const create = async () => {
    if (!userId || !form.title.trim()) return;
    setCreating(true);
    const projectId = genId();
    const { error } = await store.from('projects').insert({
      id: projectId,
      user_id: userId,
      title: form.title,
      description: form.description,
      type: form.type,
      priority: form.priority,
      due_date: form.due_date || null,
      status: 'planning',
      progress: 0,
      members: [],
      ai_generated_plan: scheduleGenerated,
      created_at: nowIso(),
    });
    if (error) { setCreating(false); toast.error(error.message); return; }

    // Insert tasks
    if (scheduledTasks.length > 0) {
      const taskRows = scheduledTasks.map((t) => ({
        id: genId(), project_id: projectId, title: t.title, done: false,
        est_minutes: t.est_minutes, due_date: new Date(`${t.date}T${t.start_time}`).toISOString(),
        ai_generated: true, created_at: nowIso(),
      }));
      await store.from('tasks').insert(taskRows);

      // Insert calendar events
      const eventRows = scheduledTasks.map((t) => ({
        id: genId(), user_id: userId, title: `${form.title}: ${t.title}`,
        type: form.type === 'assignment' ? 'assignment' : 'study',
        start_at: new Date(`${t.date}T${t.start_time}`).toISOString(),
        end_at: new Date(`${t.date}T${t.end_time}`).toISOString(),
        color: eventTypeColor[form.type === 'assignment' ? 'assignment' : 'study'] ?? '#4F7DF3',
        created_at: nowIso(),
      }));
      await store.from('calendar_events').insert(eventRows);
    }

    // Auto-create a goal if the project has a due date
    if (form.due_date) {
      const goalTitle = `Complete: ${form.title}`;
      await store.from('goals').insert({
        id: genId(),
        user_id: userId,
        title: goalTitle,
        type: 'semester',
        target: scheduledTasks.length > 0 ? scheduledTasks.length : 1,
        current: 0,
        unit: 'tasks',
        deadline: new Date(form.due_date).toISOString(),
        completed: false,
        source: 'ai_project',
        source_id: projectId,
        created_at: nowIso(),
      });
    }

    setCreating(false);
    await awardXp(userId, 15, 'Created a project', 'project');
    await logActivity(userId, 'created project', form.title);
    await pushNotification(userId, 'xp', '+15 XP', 'You earned XP for creating a project.', '/app/projects');
    const goalMsg = form.due_date ? ' Goal auto-created!' : '';
    toast.success(scheduleGenerated ? `Project created with AI schedule!${goalMsg}` : `Project created!${goalMsg}`);
    resetForm();
    setOpen(false);
    load();
  };

  return (
    <div className="space-y-6">
      <BackButton href="/app" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Projects</h1>
          <p className="text-sm text-muted-foreground">Assignments, research, capstones & group work.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" /> New project</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Create a project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Data Structures Capstone" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What's this project about?" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="group">Group Project</SelectItem>
                      <SelectItem value="research">Research</SelectItem>
                      <SelectItem value="capstone">Capstone</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="due">Due date</Label>
                  <Input id="due" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Preferred study time</Label>
                  <Input type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} />
                </div>
              </div>

              {/* AI schedule section */}
              {!scheduleGenerated ? (
                <div className="rounded-xl border-2 border-dashed border-primary-violet/40 bg-primary-violet/5 p-4">
                  <div className="flex items-start gap-3">
                    <Mascot mood="think" size={48} float={false} />
                    <div className="flex-1">
                      <h3 className="font-display text-sm font-bold">AI Auto-Scheduler</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">Let AI split your project into daily/weekly tasks with suggested dates on your calendar.</p>
                      <Button
                        className="mt-3"
                        size="sm"
                        variant="violet"
                        onClick={generateAiSchedule}
                        disabled={scheduling || !form.title.trim()}
                      >
                        {scheduling ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />}
                        {scheduling ? 'Scheduling...' : 'Suggest schedule'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-primary-violet/30 bg-primary-violet/5 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary-violet" />
                      <h3 className="font-display text-sm font-bold">Suggested schedule ({scheduledTasks.length} tasks)</h3>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setScheduleGenerated(false)}>
                      Regenerate
                    </Button>
                  </div>
                  {planPreview && (
                    <div className="mb-3 space-y-2 rounded-lg bg-card/40 p-3 text-xs">
                      <div className="flex items-start gap-1.5">
                        <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-violet" />
                        <div>
                          <span className="font-semibold">Weekly goal: </span>
                          <span className="text-muted-foreground">{planPreview.weekly_goal}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <div>
                          <span className="font-semibold">Risk: </span>
                          <span className="text-muted-foreground">{planPreview.risk}</span>
                        </div>
                      </div>
                      {planPreview.milestones.length > 0 && (
                        <div className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          <div>
                            <span className="font-semibold">Milestones: </span>
                            <span className="text-muted-foreground">{planPreview.milestones.map((m) => m.title).join(' → ')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    {scheduledTasks.map((t, i) => (
                      <div key={i} className="grid grid-cols-12 items-center gap-2 rounded-lg bg-card/60 p-2">
                        <Input
                          className="col-span-12 h-8 text-xs sm:col-span-5"
                          value={t.title}
                          onChange={(e) => updateTask(i, 'title', e.target.value)}
                        />
                        <Input
                          className="col-span-5 h-8 text-xs sm:col-span-2"
                          type="date"
                          value={t.date}
                          onChange={(e) => updateTask(i, 'date', e.target.value)}
                        />
                        <Input
                          className="col-span-4 h-8 text-xs sm:col-span-2"
                          type="time"
                          value={t.start_time}
                          onChange={(e) => updateTask(i, 'start_time', e.target.value)}
                        />
                        <button onClick={() => removeTask(i)} className="col-span-1 flex justify-center sm:col-span-1">
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-error" />
                        </button>
                        <div className="col-span-12 flex items-center gap-1 text-[10px] text-muted-foreground sm:col-span-2">
                          <Clock className="h-3 w-3" /> {t.est_minutes}m
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="mt-3" onClick={addTask}>
                    <Plus className="mr-1 h-3 w-3" /> Add task
                  </Button>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Tasks will be saved to your project checklist and automatically added to your calendar.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={create} disabled={creating || !form.title.trim()}>
                {creating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                {creating ? 'Creating...' : 'Create project'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={KanbanSquare}
          title="No projects yet"
          description="Create your first assignment, research project, or capstone and let AI break it into tasks."
          action={<Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Create a project</Button>}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <div key={p.id} className="relative">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteId(p.id); }}
                className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-card/80 text-muted-foreground opacity-0 shadow-paper-sm transition-all hover:bg-error hover:text-white group-hover:opacity-100"
                aria-label="Delete project"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <Link href={`/app/projects/${p.id}`} className="group block h-full">
              <StickyNote tint={i % 3 === 0 ? 'blue' : i % 3 === 1 ? 'mint' : 'yellow'} rotate={i % 2 === 0 ? -1 : 1} className="h-full transition-transform hover:-translate-y-1 hover:rotate-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-bold capitalize text-white" style={{ background: typeColor[p.type] ?? '#4F7DF3' }}>{p.type}</span>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: priorityColor[p.priority] }} />
                </div>
                <h3 className="mt-2 font-display text-base font-bold leading-snug">{p.title}</h3>
                {p.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  {p.due_date && <div className="flex items-center gap-1"><CalIcon className="h-3 w-3" /> {new Date(p.due_date).toLocaleDateString()}</div>}
                  {(p.members?.length ?? 0) > 0 && <div className="flex items-center gap-1"><Users className="h-3 w-3" /> {p.members!.length} member{p.members!.length > 1 ? 's' : ''}</div>}
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold capitalize">{p.status}</span>
                    <span className="text-muted-foreground">{p.progress}%</span>
                  </div>
                  <ProgressBar value={p.progress} height={6} color={typeColor[p.type] ?? '#4F7DF3'} showShine={false} />
                </div>
                <div className="mt-3 flex items-center justify-end text-xs font-semibold text-primary">
                  Open <ArrowRight className="ml-1 h-3 w-3" />
                </div>
              </StickyNote>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project, its tasks, and any calendar events linked to it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteProject}
              disabled={deleting}
              className="bg-error text-white hover:bg-error/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
