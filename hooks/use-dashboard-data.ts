'use client';

import { useEffect, useState, useCallback } from 'react';
import { store } from '@/lib/store';
import { useUser } from '@/lib/user-context';
import { computeStreak, getTotalXp, levelFromXp } from '@/lib/gamification';

export type DashboardData = {
  xp: number;
  level: number;
  intoLevel: number;
  needed: number;
  levelProgress: number;
  streak: number;
  totalStudyMinutes: number;
  todayMinutes: number;
  weeklyMinutes: { day: string; minutes: number }[];
  upcomingProjects: { id: string; title: string; due_date: string | null; priority: string; progress: number; type: string }[];
  todayEvents: { id: string; title: string; type: string; start_at: string; end_at: string; color: string }[];
  recentActivity: { id: string; verb: string; target: string; created_at: string }[];
  quizAvg: number;
  tasksDone: number;
  tasksTotal: number;
  productivityScore: number;
  achievements: { code: string; title: string; icon: string; color: string }[];
  allEvents: { id: string; title: string; start_at: string; color: string }[];
};

const QUOTES = [
  { text: 'The expert in anything was once a beginner.', author: 'Helen Hayes' },
  { text: 'Success is the sum of small efforts repeated day in and day out.', author: 'Robert Collier' },
  { text: "Don't watch the clock; do what it does. Keep going.", author: 'Sam Levenson' },
  { text: 'The future depends on what you do today.', author: 'Mahatma Gandhi' },
  { text: 'Push yourself, because no one else is going to do it for you.', author: 'Unknown' },
  { text: 'A little progress each day adds up to big results.', author: 'Unknown' },
];

export function useDashboardData() {
  const { userId } = useUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const uidVal = userId;

      const [xp, sessionsRes, projectsRes, eventsRes, activityRes, attemptsRes, achievementsRes] = await Promise.all([
        getTotalXp(uidVal),
        store.from('study_sessions').select('started_at, minutes').eq('user_id', uidVal).order('started_at', { ascending: false }),
        store.from('projects').select('id, title, due_date, priority, progress, type, status').eq('user_id', uidVal).order('due_date', { ascending: true }),
        store.from('calendar_events').select('id, title, type, start_at, end_at, color').eq('user_id', uidVal).order('start_at', { ascending: true }),
        store.from('activity_log').select('id, verb, target, created_at').eq('user_id', uidVal).order('created_at', { ascending: false }).limit(6),
        store.from('quiz_attempts').select('score, total').eq('user_id', uidVal),
        store.from('user_achievements').select('achievement_code').eq('user_id', uidVal),
      ]);

      if (!active) return;

      const sessionRows = (sessionsRes.data ?? []) as { started_at: string; minutes: number }[];
      const streak = computeStreak(sessionRows);
      const totalMinutes = sessionRows.reduce((s, r) => s + (r.minutes || 0), 0);
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayMinutes = sessionRows
        .filter((s) => s.started_at.slice(0, 10) === todayStr)
        .reduce((s, r) => s + (r.minutes || 0), 0);

      const weekMap: Record<string, number> = {};
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        weekMap[d.toISOString().slice(0, 10)] = 0;
      }
      sessionRows.forEach((s) => {
        const day = s.started_at.slice(0, 10);
        if (day in weekMap) weekMap[day] += s.minutes || 0;
      });
      const weeklyMinutes = Object.entries(weekMap).map(([date, minutes]) => ({
        day: dayNames[new Date(date).getDay() === 0 ? 6 : new Date(date).getDay() - 1],
        minutes,
      }));

      const projectRows = (projectsRes.data ?? []) as any[];
      const upcoming = projectRows
        .filter((p) => p.status !== 'done' && p.due_date)
        .slice(0, 5);

      const now = new Date();
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);
      const todayEvents = ((eventsRes.data ?? []) as any[])
        .filter((e) => new Date(e.start_at) >= now && new Date(e.start_at) <= endOfToday)
        .slice(0, 5);

      const attemptRows = (attemptsRes.data ?? []) as { score: number; total: number }[];
      const quizAvg = attemptRows.length
        ? Math.round(
            (attemptRows.reduce((s, a) => s + (a.total ? (a.score / a.total) * 100 : 0), 0) /
              attemptRows.length)
          )
        : 0;

      // tasks: need project ids
      const projectIds = projectRows.map((p) => p.id);
      const tasksRes = await store.from('tasks').select('id, done').in('project_id', projectIds);
      const taskRows = (tasksRes.data ?? []) as { id: string; done: boolean }[];
      const tasksDone = taskRows.filter((t) => t.done).length;
      const tasksTotal = taskRows.length;

      const { level, intoLevel, needed, progress } = levelFromXp(xp);

      const streakScore = Math.min(streak / 7, 1) * 30;
      const taskScore = tasksTotal ? (tasksDone / tasksTotal) * 30 : 15;
      const quizScore = (quizAvg / 100) * 25;
      const timeScore = Math.min(totalMinutes / 600, 1) * 15;
      const productivityScore = Math.round(streakScore + taskScore + quizScore + timeScore);

      // map achievements with catalog titles
      const catalog = readAchievementsCatalogLocal();
      const unlockedRows = (achievementsRes.data ?? []) as { achievement_code: string }[];
      const achievements = unlockedRows.map((u) => {
        const cat = catalog.find((c: any) => c.code === u.achievement_code);
        return {
          code: u.achievement_code,
          title: cat?.title ?? u.achievement_code,
          icon: cat?.icon ?? 'Trophy',
          color: cat?.color ?? '#FFB703',
        };
      });

      setData({
        xp, level, intoLevel, needed, levelProgress: progress,
        streak, totalStudyMinutes: totalMinutes, todayMinutes,
        weeklyMinutes, upcomingProjects: upcoming as any,
        todayEvents: todayEvents as any,
        allEvents: ((eventsRes.data ?? []) as any[]).map((e) => ({ id: e.id, title: e.title, start_at: e.start_at, color: e.color })),
        recentActivity: (activityRes.data ?? []) as any,
        quizAvg, tasksDone, tasksTotal, productivityScore,
        achievements,
      });
      setLoading(false);
    })();
    return () => { active = false; };
  }, [userId, refreshKey]);

  return { data, loading, quote, refresh };
}

function readAchievementsCatalogLocal() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('sf:catalog:achievements');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
