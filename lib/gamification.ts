import { store, readAchievementsCatalog, genId, nowIso, uid } from '@/lib/store';

export const XP_PER_LEVEL = 500;

export function levelFromXp(totalXp: number) {
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const intoLevel = totalXp % XP_PER_LEVEL;
  const progress = Math.round((intoLevel / XP_PER_LEVEL) * 100);
  return { level, intoLevel, needed: XP_PER_LEVEL, progress };
}

export async function getTotalXp(userId: string): Promise<number> {
  const { data } = await store.from('xp_log').select('amount').eq('user_id', userId);
  if (!data) return 0;
  return ((data as { amount: number }[])).reduce((sum: number, r) => sum + (r.amount || 0), 0);
}

export async function awardXp(
  userId: string,
  amount: number,
  reason: string,
  source: string
) {
  await store.from('xp_log').insert({
    id: genId(),
    user_id: userId,
    amount,
    reason,
    source,
    created_at: nowIso(),
  });
  return { awarded: true, amount, reason };
}

export async function logActivity(
  userId: string,
  verb: string,
  target: string,
  meta?: Record<string, unknown>
) {
  await store.from('activity_log').insert({
    id: genId(),
    user_id: userId,
    verb,
    target,
    meta: meta ?? {},
    created_at: nowIso(),
  });
}

export async function pushNotification(
  userId: string,
  type: string,
  title: string,
  body?: string,
  link?: string
) {
  await store.from('notifications').insert({
    id: genId(),
    user_id: userId,
    type,
    title,
    body,
    link,
    read: false,
    created_at: nowIso(),
  });
}

type Metric =
  | 'sessions'
  | 'streak'
  | 'quizzes'
  | 'flashcards'
  | 'projects'
  | 'night'
  | 'morning'
  | 'xp_total'
  | 'todos'
  | 'goals'
  | 'documents';

export async function checkAchievements(
  userId: string,
  metrics: Partial<Record<Metric, number>>
) {
  const catalog = readAchievementsCatalog();
  if (!catalog.length) return [];
  const { data: unlocked } = await store
    .from('user_achievements')
    .select('achievement_code')
    .eq('user_id', userId);
  const unlockedSet = new Set((unlocked ?? []).map((u: any) => u.achievement_code));

  const newlyUnlocked: {
    code: string;
    title: string;
    xp_reward: number;
    color: string;
    icon: string;
  }[] = [];

  for (const a of catalog) {
    if (unlockedSet.has(a.code)) continue;
    const value = metrics[a.metric as Metric];
    if (value === undefined) continue;
    if (value >= a.threshold) {
      await store.from('user_achievements').insert({
        id: genId(),
        user_id: userId,
        achievement_code: a.code,
        achieved_at: nowIso(),
      });
      await awardXp(userId, a.xp_reward, `Achievement: ${a.title}`, 'achievement');
      newlyUnlocked.push({
        code: a.code,
        title: a.title,
        xp_reward: a.xp_reward,
        color: a.color,
        icon: a.icon,
      });
    }
  }
  return newlyUnlocked;
}

export function computeStreak(sessions: { started_at: string }[]): number {
  if (sessions.length === 0) return 0;
  const days = new Set(
    sessions.map((s) => new Date(s.started_at).toISOString().slice(0, 10))
  );
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Convenience export for places that still reference uid()
export { uid };
