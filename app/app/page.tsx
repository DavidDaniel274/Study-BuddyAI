'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Flame, Sparkles, Clock, TrendingUp, Target,
  Trophy, ArrowRight, CheckCircle2, Lightbulb,
  Brain, GraduationCap, CheckSquare, BarChart3,
} from 'lucide-react';
import { PaperCard, StickyNote, ProgressBar, ProgressRing, Mascot } from '@/components/paper';
import { Button } from '@/components/ui/button';
import { useUser } from '@/lib/user-context';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { cn } from '@/lib/utils';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const priorityColor: Record<string, string> = {
  high: '#FF7F50', medium: '#FFB703', low: '#06D6A0',
};

export default function DashboardPage() {
  const { profile } = useUser();
  const { data, loading, quote } = useDashboardData();

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Mascot mood="think" size={100} />
        <p className="mt-4 text-muted-foreground">Getting your desk ready...</p>
      </div>
    );
  }

  const name = profile?.display_name?.split(' ')[0] || 'there';
  const totalWeek = data.weeklyMinutes.reduce((s, d) => s + d.minutes, 0);

  return (
    <div className="space-y-6">
      {/* Welcome banner — streamlined */}
      <PaperCard lift={false} className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-violet p-6 text-primary-foreground md:p-8">
        <div className="absolute -right-4 -top-4 opacity-30"><Mascot mood="wave" size={120} float /></div>
        <div className="relative">
          <h1 className="font-display text-2xl font-extrabold md:text-3xl">
            {greeting()}, {name}
          </h1>
          <p className="mt-1 max-w-md text-sm text-primary-foreground/80">
            {data.streak > 0
              ? `${data.streak}-day streak — ${data.todayMinutes} min studied today. Keep it up!`
              : `${data.todayMinutes} min studied today. Start a streak with one session!`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href="/app/todos"><CheckSquare className="mr-1 h-4 w-4" /> Add to-do</Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/app/assistant"><Brain className="mr-1 h-4 w-4" /> Ask AI tutor</Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/app/projects"><Target className="mr-1 h-4 w-4" /> New project</Link>
            </Button>
          </div>
        </div>
      </PaperCard>

      {/* Stat widgets row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <WidgetCard tint="coral" icon={Flame} label="Study streak" value={`${data.streak}`} sub="days in a row" />
        <WidgetCard tint="blue" icon={Sparkles} label="Total XP" value={`${data.xp}`} sub={`Level ${data.level}`} />
        <WidgetCard tint="mint" icon={Clock} label="Study time" value={`${Math.floor(data.totalStudyMinutes / 60)}h`} sub={`${data.totalStudyMinutes % 60}m total`} />
        <WidgetCard tint="violet" icon={Target} label="Productivity" value={`${data.productivityScore}`} sub="/ 100 score" />
      </div>

      {/* Main grid: Weekly progress + Productivity ring */}
      <div className="grid gap-6 lg:grid-cols-3">
        <PaperCard className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">Weekly progress</h2>
              <p className="text-sm text-muted-foreground">Study minutes over the last 7 days</p>
            </div>
            <TrendingUp className="h-5 w-5 text-accent" />
          </div>
          <WeeklyChart data={data.weeklyMinutes} />
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Stat label="This week" value={`${totalWeek}m`} />
            <Stat label="Daily avg" value={`${Math.round(totalWeek / 7)}m`} />
            <Stat label="Today" value={`${data.todayMinutes}m`} />
          </div>
        </PaperCard>

        <PaperCard className="flex flex-col items-center justify-center p-6">
          <h2 className="mb-1 font-display text-lg font-bold">Productivity score</h2>
          <p className="mb-4 text-center text-sm text-muted-foreground">Streak, tasks, quizzes & time</p>
          <ProgressRing value={data.productivityScore} size={160} strokeWidth={14} color="#6C63FF" label={`${data.productivityScore}`} />
          <p className="mt-4 text-xs text-muted-foreground">
            {data.productivityScore >= 75 ? 'On fire! Keep this rhythm.' : data.productivityScore >= 50 ? 'Solid week — push a little more.' : 'A few sessions today will boost this fast.'}
          </p>
        </PaperCard>
      </div>

      {/* Deadlines + Today's schedule */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PaperCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Upcoming deadlines</h2>
            <Link href="/app/projects" className="text-xs font-semibold text-primary hover:underline">View all</Link>
          </div>
          {data.upcomingProjects.length === 0 ? (
            <EmptyMini icon={CheckCircle2} text="No deadlines coming up. Nice!" />
          ) : (
            <div className="space-y-2">
              {data.upcomingProjects.slice(0, 4).map((p) => {
                const days = p.due_date ? Math.ceil((new Date(p.due_date).getTime() - Date.now()) / 86400000) : null;
                return (
                  <Link key={p.id} href="/app/projects" className="flex items-center gap-3 rounded-xl border border-border/60 p-3 transition-all hover:-translate-y-0.5 hover:shadow-paper-sm">
                    <span className="h-10 w-1.5 rounded-full" style={{ background: priorityColor[p.priority] ?? '#4F7DF3' }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{p.type} · {days !== null ? (days <= 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `${days} days left`) : 'No date'}</p>
                    </div>
                    <div className="w-20"><ProgressBar value={p.progress} height={6} color={priorityColor[p.priority] ?? '#4F7DF3'} showShine={false} /></div>
                  </Link>
                );
              })}
            </div>
          )}
        </PaperCard>

        <PaperCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Today's schedule</h2>
            <Link href="/app/calendar" className="text-xs font-semibold text-primary hover:underline">Calendar</Link>
          </div>
          {data.todayEvents.length === 0 ? (
            <EmptyMini icon={Clock} text="Nothing scheduled today. Add a to-do to auto-fill your calendar!" />
          ) : (
            <div className="space-y-2">
              {data.todayEvents.slice(0, 5).map((e) => (
                <div key={e.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                  <span className="h-8 w-1.5 rounded-full" style={{ background: e.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{e.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{e.type}</p>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">
                    {new Date(e.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </PaperCard>
      </div>

      {/* AI recommendations + quick links */}
      <div className="grid gap-6 lg:grid-cols-3">
        <StickyNote tint="mint" rotate={-1} tapeColor="yellow" className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-accent" />
            <h2 className="font-display text-lg font-bold">AI recommendations</h2>
          </div>
          <ul className="space-y-2.5 text-sm">
            {data.quizAvg > 0 && data.quizAvg < 70 && (
              <RecItem>Your average quiz score is {data.quizAvg}%. Review weak topics and try a practice quiz.</RecItem>
            )}
            {data.streak === 0 && <RecItem>You don't have an active streak yet — one 25-minute session today will start one.</RecItem>
            }
            {data.upcomingProjects.length > 0 && data.upcomingProjects[0] && (
              <RecItem>{data.upcomingProjects[0].title} is due soon. Break it into 3 small tasks to avoid a crunch.</RecItem>
            )}
            {data.tasksTotal > 0 && data.tasksDone < data.tasksTotal && (
              <RecItem>You have {data.tasksTotal - data.tasksDone} open tasks. Knock out the quick ones first to build momentum.</RecItem>
            )}
            <RecItem>You focus best between 18:00 and 20:00 based on your session history. Block that window for hard topics.</RecItem>
          </ul>
        </StickyNote>

        <div className="space-y-3">
          <QuickLink href="/app/flashcards" icon={Sparkles} label="Review flashcards" tint="#06D6A0" />
          <QuickLink href="/app/quizzes" icon={GraduationCap} label="Take a quiz" tint="#6C63FF" />
          <QuickLink href="/app/analytics" icon={BarChart3} label="View analytics" tint="#FFB703" />
          <PaperCard className="flex flex-col justify-between p-5" lift={false}>
            <Trophy className="h-5 w-5 text-secondary" />
            <p className="my-2 font-display text-sm font-semibold italic leading-relaxed">"{quote.text}"</p>
            <p className="text-xs font-semibold text-muted-foreground">— {quote.author}</p>
          </PaperCard>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ href, icon: Icon, label, tint }: { href: string; icon: any; label: string; tint: string }) {
  return (
    <Link href={href}>
      <PaperCard className="flex items-center gap-3 p-4 transition-transform hover:-translate-y-0.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${tint}22` }}>
          <Icon className="h-4 w-4" style={{ color: tint }} />
        </span>
        <span className="font-display text-sm font-bold">{label}</span>
        <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
      </PaperCard>
    </Link>
  );
}

function WidgetCard({ tint, icon: Icon, label, value, sub }: { tint: 'coral'|'blue'|'mint'|'violet'|'pink'|'yellow'; icon: any; label: string; value: string; sub: string }) {
  const bg: Record<string, string> = {
    coral: 'bg-coral/10', blue: 'bg-primary/10', mint: 'bg-accent/10', violet: 'bg-primary-violet/10', pink: 'bg-pink/10', yellow: 'bg-secondary/30',
  };
  const fg: Record<string, string> = {
    coral: 'text-coral', blue: 'text-primary', mint: 'text-accent', violet: 'text-primary-violet', pink: 'text-pink', yellow: 'text-secondary-foreground',
  };
  return (
    <PaperCard className="p-5">
      <div className={cn('mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl', bg[tint])}>
        <Icon className={cn('h-5 w-5', fg[tint])} />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </PaperCard>
  );
}

function WeeklyChart({ data }: { data: { day: string; minutes: number }[] }) {
  const max = Math.max(60, ...data.map((d) => d.minutes));
  return (
    <div className="flex h-40 items-end justify-between gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-lg transition-all duration-700 ease-out"
              style={{
                height: `${Math.max(4, (d.minutes / max) * 100)}%`,
                background: d.minutes > 0 ? 'linear-gradient(to top, #4F7DF3, #6C63FF)' : 'hsl(var(--muted))',
              }}
              title={`${d.minutes} min`}
            />
          </div>
          <span className="text-xs font-semibold text-muted-foreground">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-2.5">
      <p className="font-display text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function RecItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
      <span className="text-muted-foreground">{children}</span>
    </li>
  );
}

function EmptyMini({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icon className="mb-2 h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
