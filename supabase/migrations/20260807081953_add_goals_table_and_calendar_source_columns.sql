/*
# Add goals table and calendar event source tracking

1. New Tables
- `goals` — learning goals (daily, weekly, monthly, semester, custom)
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to auth.users, defaults to auth.uid())
  - `title` (text)
  - `type` (text: daily/weekly/monthly/semester/custom)
  - `target` (int)
  - `current` (int, default 0)
  - `unit` (text: hours, tasks, pages, etc.)
  - `deadline` (timestamptz, nullable)
  - `completed` (boolean, default false)
  - `source` (text, nullable — tracks if AI auto-created: 'ai_project')
  - `source_id` (uuid, nullable — links to the project that triggered the goal)
  - `created_at` (timestamptz)

2. Modified Tables
- `calendar_events` — adds two nullable columns for source tracking:
  - `source` (text, nullable — 'todo', 'ai_project', 'manual')
  - `source_id` (uuid, nullable — links to the todo or project that created the event)

3. Security
- RLS enabled on `goals` with 4 owner-scoped policies (select/insert/update/delete)
- Existing `calendar_events` policies already cover the new columns (no policy changes needed)
- `user_id` on goals defaults to `auth.uid()` so client inserts omitting it still succeed

4. Notes
- Uses DO $$ ... END $$ for conditional column adds to be idempotent
- Goals table was referenced by the goals page but missing from the original migration
*/

-- ---------- goals ----------
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'weekly',
  target int NOT NULL DEFAULT 1,
  current int NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'tasks',
  deadline timestamptz,
  completed boolean NOT NULL DEFAULT false,
  source text,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goals_select_own" ON goals;
CREATE POLICY "goals_select_own" ON goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "goals_insert_own" ON goals;
CREATE POLICY "goals_insert_own" ON goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "goals_update_own" ON goals;
CREATE POLICY "goals_update_own" ON goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "goals_delete_own" ON goals;
CREATE POLICY "goals_delete_own" ON goals FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS goals_user_idx ON goals(user_id);

-- ---------- calendar_events: add source tracking columns ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'source') THEN
    ALTER TABLE calendar_events ADD COLUMN source text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'source_id') THEN
    ALTER TABLE calendar_events ADD COLUMN source_id uuid;
  END IF;
END $$;
