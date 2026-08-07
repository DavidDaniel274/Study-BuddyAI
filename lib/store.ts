'use client';

/**
 * Browser-local persistence layer for StudyFlow AI.
 * No authentication, no API keys. Data is stored in localStorage under a
 * stable per-browser user id and a per-user namespace.
 *
 * Mirrors a subset of the Supabase client API (from()/select/insert/update/
 * delete/eq/order/limit/single/maybeSingle) so the existing pages swap over
 * with minimal changes.
 */

const NS = 'sf:'; // storage namespace prefix

function getBrowserUserId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem(`${NS}user_id`);
  if (!id) {
    id = (crypto?.randomUUID?.() ?? `u_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(`${NS}user_id`, id);
  }
  return id;
}

function collectionKey(table: string): string {
  const uid = getBrowserUserId();
  return `${NS}data:${uid}:${table}`;
}

type Row = Record<string, any>;

function read<T = Row>(table: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(collectionKey(table));
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write(table: string, rows: Row[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(collectionKey(table), JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent('sf-data-change', { detail: { table } }));
}

export function uid(): string {
  return getBrowserUserId();
}

export function genId(): string {
  return crypto?.randomUUID?.() ?? `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** A query builder mirroring enough of supabase to swap in cleanly. */
class QueryBuilder {
  private rows: Row[] = [];
  private filters: { col: string; val: any; op: 'eq' | 'in' | 'neq' }[] = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;
  private selectCols: string | null = null;

  constructor(private table: string) {
    this.rows = read(this.table);
  }

  select(columns?: string) {
    this.selectCols = columns ?? '*';
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push({ col, val, op: 'eq' });
    return this;
  }

  in(col: string, vals: any[]) {
    this.filters.push({ col, val: vals, op: 'in' });
    return this;
  }

  neq(col: string, val: any) {
    this.filters.push({ col, val, op: 'neq' });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAsc = opts?.ascending ?? true;
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  private applyFilters(): Row[] {
    let out = this.rows;
    for (const f of this.filters) {
      if (f.op === 'eq') out = out.filter((r) => r[f.col] === f.val);
      else if (f.op === 'neq') out = out.filter((r) => r[f.col] !== f.val);
      else if (f.op === 'in') out = out.filter((r) => (f.val as any[]).includes(r[f.col]));
    }
    if (this.orderCol) {
      out = [...out].sort((a, b) => {
        const av = a[this.orderCol as string];
        const bv = b[this.orderCol as string];
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av < bv) return this.orderAsc ? -1 : 1;
        if (av > bv) return this.orderAsc ? 1 : -1;
        return 0;
      });
    }
    if (this.limitN != null) out = out.slice(0, this.limitN);
    return out;
  }

  private project(rows: Row[]): Row[] {
    if (!this.selectCols || this.selectCols === '*') return rows;
    const cols = this.selectCols.split(',').map((c) => c.trim());
    return rows.map((r) => {
      const o: Row = {};
      for (const c of cols) o[c] = r[c];
      return o;
    });
  }

  async run(): Promise<{ data: Row[] | null; error: { message: string } | null }> {
    try {
      const filtered = this.applyFilters();
      return { data: this.project(filtered), error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message ?? 'read error' } };
    }
  }

  then(onFulfilled: (v: { data: Row[] | Row | null; error: { message: string } | null }) => any) {
    if (this._mutation) {
      return Promise.resolve(this.runMutation()).then(onFulfilled);
    }
    return Promise.resolve(this.run()).then(onFulfilled);
  }

  // Supabase-compatible accessor used by pages: `const { data } = await supabase.from(t).select()`
  get [Symbol.toPrimitive]() {
    return undefined;
  }

  async insert(payload: Row | Row[]): Promise<{ data: Row | null; error: { message: string } | null }> {
    try {
      const arr = Array.isArray(payload) ? payload : [payload];
      const existing = read(this.table);
      const created = arr.map((r) => ({
        id: r.id ?? genId(),
        user_id: r.user_id ?? getBrowserUserId(),
        created_at: r.created_at ?? nowIso(),
        ...r,
      }));
      write(this.table, [...existing, ...created]);
      const single = created.length === 1 ? created[0] : null;
      return { data: single, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message ?? 'insert error' } };
    }
  }

  // These return `this` so filters can chain: store.from(t).update({...}).eq(...).then(...)
  // Execution happens on await via `then()`.
  update(patch: Row) {
    this._mutation = { kind: 'update', patch };
    return this;
  }

  delete() {
    this._mutation = { kind: 'delete' };
    return this;
  }

  private _mutation: { kind: 'update'; patch: Row } | { kind: 'delete' } | null = null;

  private async runMutation(): Promise<{ data: Row[] | null; error: { message: string } | null }> {
    try {
      const all = read(this.table);
      const targets = this.applyFilters();
      const targetIds = new Set(targets.map((r) => r.id));
      if (this._mutation?.kind === 'delete') {
        write(this.table, all.filter((r) => !targetIds.has(r.id)));
        return { data: targets, error: null };
      }
      if (this._mutation?.kind === 'update') {
        const patch = this._mutation.patch;
        const updated = all.map((r) => (targetIds.has(r.id) ? { ...r, ...patch } : r));
        write(this.table, updated);
        return { data: targets.map((r) => ({ ...r, ...patch })), error: null };
      }
      return { data: targets, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message ?? 'mutation error' } };
    }
  }

  async maybeSingle(): Promise<{ data: Row | null; error: { message: string } | null }> {
    const res = await this.run();
    const arr = res.data ?? [];
    return { data: arr.length > 0 ? arr[0] : null, error: res.error };
  }

  async single(): Promise<{ data: Row | null; error: { message: string } | null }> {
    const res = await this.maybeSingle();
    if (!res.data) return { data: null, error: { message: 'no rows' } };
    return res;
  }
}

/** Drop-in replacement for the supabase client. */
export const store = {
  from(table: string) {
    return new QueryBuilder(table);
  },
  auth: {
    // No-op auth shim so legacy code doesn't crash.
    signOut: async () => {},
    getSession: async () => ({ data: { session: null } }),
  },
};

/** Seed the achievements catalog + default profile for a new browser user. */
export function ensureSeed() {
  if (typeof window === 'undefined') return;
  const uid = getBrowserUserId();

  // profile
  const profiles = read('profiles');
  if (!profiles.find((p) => p.id === uid)) {
    write('profiles', [
      ...profiles,
      {
        id: uid,
        display_name: 'Student',
        bio: '',
        timezone: 'UTC',
        theme: 'light',
        daily_goal_minutes: 120,
        onboarded: false,
        created_at: nowIso(),
      },
    ]);
  }

  // achievements catalog (shared, not user-scoped — stored globally)
  const achKey = `${NS}catalog:achievements`;
  if (!localStorage.getItem(achKey)) {
    const catalog = [
      { code: 'first_session', title: 'First Focus', description: 'Complete your first study session', icon: 'Flame', color: '#FF7F50', xp_reward: 50, metric: 'sessions', threshold: 1 },
      { code: 'streak_3', title: 'On a Roll', description: 'Maintain a 3-day study streak', icon: 'Flame', color: '#FFB703', xp_reward: 75, metric: 'streak', threshold: 3 },
      { code: 'streak_7', title: 'Week Warrior', description: 'Maintain a 7-day study streak', icon: 'Flame', color: '#FF7F50', xp_reward: 150, metric: 'streak', threshold: 7 },
      { code: 'quiz_master', title: 'Quiz Master', description: 'Complete 5 quizzes', icon: 'Brain', color: '#6C63FF', xp_reward: 100, metric: 'quizzes', threshold: 5 },
      { code: 'flashcard_50', title: 'Memory Maker', description: 'Review 50 flashcards', icon: 'Layers', color: '#06D6A0', xp_reward: 100, metric: 'flashcards', threshold: 50 },
      { code: 'project_done', title: 'Project Complete', description: 'Finish your first project', icon: 'Trophy', color: '#4F7DF3', xp_reward: 120, metric: 'projects', threshold: 1 },
      { code: 'night_owl', title: 'Night Owl', description: 'Study after 9pm 5 times', icon: 'Moon', color: '#8BD3DD', xp_reward: 80, metric: 'night', threshold: 5 },
      { code: 'xp_500', title: 'Rising Star', description: 'Earn 500 total XP', icon: 'Sparkles', color: '#F78FB3', xp_reward: 200, metric: 'xp_total', threshold: 500 },
      { code: 'xp_2000', title: 'Scholar', description: 'Earn 2000 total XP', icon: 'GraduationCap', color: '#6C63FF', xp_reward: 400, metric: 'xp_total', threshold: 2000 },
      { code: 'early_bird', title: 'Early Bird', description: 'Study before 8am 5 times', icon: 'Sun', color: '#FFD166', xp_reward: 80, metric: 'morning', threshold: 5 },
      { code: 'todo_25', title: 'Task Master', description: 'Complete 25 to-do items', icon: 'CheckSquare', color: '#06D6A0', xp_reward: 100, metric: 'todos', threshold: 25 },
      { code: 'goal_5', title: 'Goal Getter', description: 'Complete 5 goals', icon: 'Target', color: '#4F7DF3', xp_reward: 150, metric: 'goals', threshold: 5 },
      { code: 'doc_10', title: 'Collector', description: 'Upload 10 documents', icon: 'FolderOpen', color: '#8BD3DD', xp_reward: 100, metric: 'documents', threshold: 10 },
    ];
    localStorage.setItem(achKey, JSON.stringify(catalog));
  }
}

/** Read the achievements catalog (shared, not user-scoped). */
export function readAchievementsCatalog() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${NS}catalog:achievements`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Subscribe to data changes (cross-component reactivity). */
export function onDataChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => cb();
  window.addEventListener('sf-data-change', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('sf-data-change', handler);
    window.removeEventListener('storage', handler);
  };
}
