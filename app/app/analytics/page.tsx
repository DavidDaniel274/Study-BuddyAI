'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar,
} from 'recharts';
import { Clock, GraduationCap, CheckCircle2, Flame, TrendingUp, Loader2, Brain } from 'lucide-react';
import { PaperCard, StickyNote, ProgressRing, Mascot } from '@/components/paper';
import { BackButton } from '@/components/app/back-button';
import { store } from '@/lib/store';
import { useUser } from '@/lib/user-context';
import { computeStreak, getTotalXp, levelFromXp } from '@/lib/gamification';

const PIE_COLORS = ['#4F7DF3', '#6C63FF', '#06D6A0', '#FFB703', '#F78FB3'];

export default function AnalyticsPage() {
  const { userId } = useUser();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const uidVal = userId;
      const [sessions, attempts, projects, flashcards, xp] = await Promise.all([
        store.from('study_sessions').select('started_at, minutes').eq('user_id', uidVal).order('started_at', { ascending: true }),
        store.from('quiz_attempts').select('score, total, completed_at').eq('user_id', uidVal).order('completed_at', { ascending: true }),
        store.from('projects').select('id, status, progress').eq('user_id', uidVal),
        store.from('flashcards').select('id, reps, lapses').eq('user_id', uidVal),
        getTotalXp(uidVal),
      ]);

      const projectIds = (projects.data ?? []).map((p: any) => p.id);
      const { data: taskData } = await store.from('tasks').select('id, done').in('project_id', projectIds);

      const sessionRows = (sessions.data ?? []) as { started_at: string; minutes: number }[];
      const streak = computeStreak(sessionRows);
      const totalMinutes = sessionRows.reduce((s: number, r: any) => s + (r.minutes || 0), 0);

      // 14-day study time
      const dayMap: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        dayMap[d.toISOString().slice(0, 10)] = 0;
      }
      sessionRows.forEach((s: any) => { const k = s.started_at.slice(0, 10); if (k in dayMap) dayMap[k] += s.minutes || 0; });
      const dailyData = Object.entries(dayMap).map(([date, minutes]) => ({ date: date.slice(5), minutes }));

      // quiz scores over time
      const attemptRows = attempts.data ?? [];
      const quizData = attemptRows.map((a: any, i: number) => ({ attempt: `Q${i + 1}`, score: a.total ? Math.round((a.score / a.total) * 100) : 0 }));
      const avgScore = attemptRows.length ? Math.round(attemptRows.reduce((s: number, a: any) => s + (a.total ? (a.score / a.total) * 100 : 0), 0) / attemptRows.length) : 0;

      // project status distribution
      const projectRows = projects.data ?? [];
      const statusCounts: Record<string, number> = { planning: 0, 'in progress': 0, done: 0 };
      projectRows.forEach((p: any) => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1; });
      const pieData = Object.entries(statusCounts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));

      const taskRows = (taskData ?? []) as any[];
      const tasksDone = taskRows.filter((t) => t.done).length;
      const completionRate = taskRows.length ? Math.round((tasksDone / taskRows.length) * 100) : 0;

      const cardRows = flashcards.data ?? [];
      const cardReviews = cardRows.reduce((s: number, c: any) => s + (c.reps || 0), 0);

      const { level } = levelFromXp(xp);

      setData({ streak, totalMinutes, dailyData, quizData, avgScore, pieData, tasksDone, tasksTotal: taskRows.length, completionRate, cardReviews, projectCount: projectRows.length, doneProjects: statusCounts.done, xp, level });
      setLoading(false);
    })();
  }, [userId]);

  if (loading || !data) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <BackButton href="/app" />
      <div>
        <h1 className="font-display text-2xl font-extrabold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Track your study habits, quiz performance, and progress over time.</p>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Clock} color="#4F7DF3" label="Total study time" value={`${Math.floor(data.totalMinutes / 60)}h ${data.totalMinutes % 60}m`} />
        <KpiCard icon={GraduationCap} color="#06D6A0" label="Avg quiz score" value={`${data.avgScore}%`} />
        <KpiCard icon={Flame} color="#FF7F50" label="Current streak" value={`${data.streak} days`} />
        <KpiCard icon={CheckCircle2} color="#FFB703" label="Task completion" value={`${data.completionRate}%`} />
      </div>

      {/* Study time chart */}
      <PaperCard className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold">Study time — last 14 days</h2>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--paper))' }} />
            <Bar dataKey="minutes" radius={[8, 8, 0, 0]} fill="#4F7DF3" animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
      </PaperCard>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quiz scores */}
        <PaperCard className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-accent" />
            <h2 className="font-display text-lg font-bold">Quiz scores over time</h2>
          </div>
          {data.quizData.length === 0 ? (
            <Empty text="Take a quiz to see your score trend." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.quizData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="attempt" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--paper))' }} />
                <Line type="monotone" dataKey="score" stroke="#06D6A0" strokeWidth={3} dot={{ r: 5, fill: '#06D6A0' }} animationDuration={800} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </PaperCard>

        {/* Project status pie */}
        <PaperCard className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-secondary" />
            <h2 className="font-display text-lg font-bold">Project status</h2>
          </div>
          {data.pieData.length === 0 ? (
            <Empty text="Create a project to see status breakdown." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={4} animationDuration={800}>
                  {data.pieData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--paper))' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="mt-2 flex justify-center gap-4 text-xs">
            {data.pieData.map((p: any, i: number) => (
              <span key={p.name} className="flex items-center gap-1.5 capitalize">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} /> {p.name} ({p.value})
              </span>
            ))}
          </div>
        </PaperCard>
      </div>

      {/* Weak topics + recommendations */}
      <div className="grid gap-6 lg:grid-cols-3">
        <StickyNote tint="pink" rotate={-1} className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Brain className="h-5 w-5 text-pink" />
            <h2 className="font-display text-lg font-bold">Weak topic detection</h2>
          </div>
          {data.avgScore > 0 && data.avgScore < 70 ? (
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-coral">Your average quiz score ({data.avgScore}%) suggests these areas need work:</p>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>• <strong className="text-foreground">Core concepts</strong> — review fundamentals and redo easy quizzes</li>
                <li>• <strong className="text-foreground">Application</strong> — try practice problems, not just definitions</li>
                <li>• <strong className="text-foreground">Recall speed</strong> — use flashcards for spaced repetition</li>
              </ul>
              <p className="mt-3 font-semibold text-accent">Recommended: 2 extra study sessions + 1 practice quiz this week.</p>
            </div>
          ) : data.avgScore >= 70 ? (
            <p className="text-sm text-muted-foreground">Your quiz scores are strong ({data.avgScore}%). Keep reviewing flashcards to maintain retention and try harder difficulty quizzes to push further.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Take a quiz and I'll analyse your results to detect weak topics and build a revision plan.</p>
          )}
        </StickyNote>

        <PaperCard className="flex flex-col items-center justify-center p-6" lift={false}>
          <Mascot mood="happy" size={80} />
          <h3 className="mt-3 font-display text-base font-bold">Your level</h3>
          <ProgressRing value={(data.xp % 500) / 5} size={120} color="#6C63FF" label={`Lv ${data.level}`} />
          <p className="mt-2 text-xs text-muted-foreground">{data.xp} total XP</p>
        </PaperCard>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, color, label, value }: { icon: any; color: string; label: string; value: string }) {
  return (
    <PaperCard className="p-5">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}22` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-extrabold">{value}</p>
    </PaperCard>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">{text}</div>;
}
