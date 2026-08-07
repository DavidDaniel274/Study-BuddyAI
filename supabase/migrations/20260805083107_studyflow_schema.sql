/*
# StudyFlow AI core schema

Creates the full data model for the StudyFlow AI academic productivity platform.

1. New tables
- `profiles` — denormalized user info (display name, avatar, bio, timezone, theme, daily_goal_minutes)
- `courses` — courses a student is enrolled in (name, color, semester)
- `projects` — assignments / group / research / capstone projects, with priority, status, due date, type, members (array), description
- `tasks` — checklist tasks belonging to a project (title, done, est_minutes, due_date, ai_generated flag)
- `milestones` — project milestones (title, target_date, reached)
- `documents` — uploaded study materials (name, type, content text, embedding placeholder, summary)
- `chat_messages` — AI study assistant conversation turns (role, content, document_id optional)
- `quizzes` — generated quizzes (title, topic, difficulty, source_document optional)
- `quiz_questions` — questions in a quiz (type, prompt, options json, answer, explanation)
- `quiz_attempts` — a student's attempt at a quiz (score, answers json, completed_at)
- `flashcards` — spaced-repetition cards (front, back, ease, interval, due, reps, lapses)
- `study_sessions` — logged focus sessions (started_at, ended_at, minutes, project optional, tag)
- `calendar_events` — scheduled events (title, type, start, "end", color, project optional)
- `notifications` — in-app notifications (type, title, body, read, link)
- `achievements` — catalog of unlockable achievements (code, title, description, icon, color, xp_reward, threshold, metric)
- `user_achievements` — achievements unlocked by a user (achieved_at)
- `xp_log` — XP awarded entries (amount, reason, source)
- `activity_log` — recent activity feed entries (verb, target, meta json)

2. Security
- RLS enabled on every table.
- All tables are owner-scoped to the authenticated user via `auth.uid() = user_id` (or `id` for profiles).
- `profiles.id` mirrors `auth.users.id` (no separate auth table).
- Owner columns default to `auth.uid()` so inserts that omit user_id still satisfy WITH CHECK.
- 4 separate policies (select/insert/update/delete) per table, scoped TO authenticated.

3. Notes
- Achievements are a shared catalog seeded once; ownership of unlock state lives in `user_achievements`.
- Embeddings stored as text placeholder (vector extension optional / not required for demo RAG simulation).
- No destructive operations; idempotent via IF NOT EXISTS.
*/

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  bio text,
  timezone text DEFAULT 'UTC',
  theme text DEFAULT 'light',
  daily_goal_minutes int NOT NULL DEFAULT 120,
  onboarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- ---------- courses ----------
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  color text NOT NULL DEFAULT '#4F7DF3',
  semester text,
  instructor text,
  progress int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "courses_select_own" ON courses;
CREATE POLICY "courses_select_own" ON courses FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "courses_insert_own" ON courses;
CREATE POLICY "courses_insert_own" ON courses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "courses_update_own" ON courses;
CREATE POLICY "courses_update_own" ON courses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "courses_delete_own" ON courses;
CREATE POLICY "courses_delete_own" ON courses FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS courses_user_idx ON courses(user_id);

-- ---------- projects ----------
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'assignment',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'planning',
  due_date timestamptz,
  progress int NOT NULL DEFAULT 0,
  members text[] NOT NULL DEFAULT '{}',
  ai_generated_plan boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projects_select_own" ON projects;
CREATE POLICY "projects_select_own" ON projects FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "projects_insert_own" ON projects;
CREATE POLICY "projects_insert_own" ON projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "projects_update_own" ON projects;
CREATE POLICY "projects_update_own" ON projects FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "projects_delete_own" ON projects;
CREATE POLICY "projects_delete_own" ON projects FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS projects_user_idx ON projects(user_id);

-- ---------- tasks ----------
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  est_minutes int NOT NULL DEFAULT 30,
  due_date timestamptz,
  ai_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS tasks_project_idx ON tasks(project_id);

-- ---------- milestones ----------
CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_date timestamptz,
  reached boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS milestones_project_idx ON milestones(project_id);

-- ---------- documents ----------
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  content text NOT NULL DEFAULT '',
  summary text,
  pages int,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "documents_select_own" ON documents;
CREATE POLICY "documents_select_own" ON documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "documents_insert_own" ON documents;
CREATE POLICY "documents_insert_own" ON documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "documents_update_own" ON documents;
CREATE POLICY "documents_update_own" ON documents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "documents_delete_own" ON documents;
CREATE POLICY "documents_delete_own" ON documents FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS documents_user_idx ON documents(user_id);

-- ---------- chat_messages ----------
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_messages_select_own" ON chat_messages;
CREATE POLICY "chat_messages_select_own" ON chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "chat_messages_insert_own" ON chat_messages;
CREATE POLICY "chat_messages_insert_own" ON chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "chat_messages_update_own" ON chat_messages;
CREATE POLICY "chat_messages_update_own" ON chat_messages FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "chat_messages_delete_own" ON chat_messages;
CREATE POLICY "chat_messages_delete_own" ON chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS chat_messages_user_idx ON chat_messages(user_id, created_at);

-- ---------- quizzes ----------
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  topic text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium',
  question_count int NOT NULL DEFAULT 0,
  source_document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quizzes_select_own" ON quizzes;
CREATE POLICY "quizzes_select_own" ON quizzes FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "quizzes_insert_own" ON quizzes;
CREATE POLICY "quizzes_insert_own" ON quizzes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "quizzes_update_own" ON quizzes;
CREATE POLICY "quizzes_update_own" ON quizzes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "quizzes_delete_own" ON quizzes;
CREATE POLICY "quizzes_delete_own" ON quizzes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS quizzes_user_idx ON quizzes(user_id);

-- ---------- quiz_questions ----------
CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  type text NOT NULL,
  prompt text NOT NULL,
  options jsonb,
  answer text NOT NULL,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS quiz_questions_quiz_idx ON quiz_questions(quiz_id);

-- ---------- quiz_attempts ----------
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score int NOT NULL DEFAULT 0,
  total int NOT NULL DEFAULT 0,
  answers jsonb,
  completed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quiz_attempts_select_own" ON quiz_attempts;
CREATE POLICY "quiz_attempts_select_own" ON quiz_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "quiz_attempts_insert_own" ON quiz_attempts;
CREATE POLICY "quiz_attempts_insert_own" ON quiz_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "quiz_attempts_update_own" ON quiz_attempts;
CREATE POLICY "quiz_attempts_update_own" ON quiz_attempts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "quiz_attempts_delete_own" ON quiz_attempts;
CREATE POLICY "quiz_attempts_delete_own" ON quiz_attempts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS quiz_attempts_user_idx ON quiz_attempts(user_id);

-- ---------- flashcards ----------
CREATE TABLE IF NOT EXISTS flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  deck text NOT NULL DEFAULT 'General',
  front text NOT NULL,
  back text NOT NULL,
  ease real NOT NULL DEFAULT 2.5,
  interval int NOT NULL DEFAULT 1,
  reps int NOT NULL DEFAULT 0,
  lapses int NOT NULL DEFAULT 0,
  due timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "flashcards_select_own" ON flashcards;
CREATE POLICY "flashcards_select_own" ON flashcards FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "flashcards_insert_own" ON flashcards;
CREATE POLICY "flashcards_insert_own" ON flashcards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "flashcards_update_own" ON flashcards;
CREATE POLICY "flashcards_update_own" ON flashcards FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "flashcards_delete_own" ON flashcards;
CREATE POLICY "flashcards_delete_own" ON flashcards FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS flashcards_user_due_idx ON flashcards(user_id, due);

-- ---------- study_sessions ----------
CREATE TABLE IF NOT EXISTS study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  minutes int NOT NULL DEFAULT 0,
  tag text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "study_sessions_select_own" ON study_sessions;
CREATE POLICY "study_sessions_select_own" ON study_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "study_sessions_insert_own" ON study_sessions;
CREATE POLICY "study_sessions_insert_own" ON study_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "study_sessions_update_own" ON study_sessions;
CREATE POLICY "study_sessions_update_own" ON study_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "study_sessions_delete_own" ON study_sessions;
CREATE POLICY "study_sessions_delete_own" ON study_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS study_sessions_user_idx ON study_sessions(user_id, started_at);

-- ---------- calendar_events ----------
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'study',
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  color text NOT NULL DEFAULT '#4F7DF3',
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "calendar_events_select_own" ON calendar_events;
CREATE POLICY "calendar_events_select_own" ON calendar_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "calendar_events_insert_own" ON calendar_events;
CREATE POLICY "calendar_events_insert_own" ON calendar_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "calendar_events_update_own" ON calendar_events;
CREATE POLICY "calendar_events_update_own" ON calendar_events FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "calendar_events_delete_own" ON calendar_events;
CREATE POLICY "calendar_events_delete_own" ON calendar_events FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS calendar_events_user_idx ON calendar_events(user_id, start_at);

-- ---------- notifications ----------
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
CREATE POLICY "notifications_insert_own" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, created_at);

-- ---------- achievements (shared catalog) ----------
CREATE TABLE IF NOT EXISTS achievements (
  code text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'Trophy',
  color text NOT NULL DEFAULT '#FFB703',
  xp_reward int NOT NULL DEFAULT 50,
  metric text NOT NULL,
  threshold int NOT NULL DEFAULT 1
);
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "achievements_select_any" ON achievements;
CREATE POLICY "achievements_select_any" ON achievements FOR SELECT TO authenticated USING (true);

-- ---------- user_achievements ----------
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_code text NOT NULL REFERENCES achievements(code) ON DELETE CASCADE,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_code)
);
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_achievements_select_own" ON user_achievements;
CREATE POLICY "user_achievements_select_own" ON user_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_achievements_insert_own" ON user_achievements;
CREATE POLICY "user_achievements_insert_own" ON user_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_achievements_update_own" ON user_achievements;
CREATE POLICY "user_achievements_update_own" ON user_achievements FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_achievements_delete_own" ON user_achievements;
CREATE POLICY "user_achievements_delete_own" ON user_achievements FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---------- xp_log ----------
CREATE TABLE IF NOT EXISTS xp_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount int NOT NULL DEFAULT 0,
  reason text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE xp_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "xp_log_select_own" ON xp_log;
CREATE POLICY "xp_log_select_own" ON xp_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "xp_log_insert_own" ON xp_log;
CREATE POLICY "xp_log_insert_own" ON xp_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "xp_log_delete_own" ON xp_log;
CREATE POLICY "xp_log_delete_own" ON xp_log FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS xp_log_user_idx ON xp_log(user_id, created_at);

-- ---------- activity_log ----------
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  verb text NOT NULL,
  target text NOT NULL,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_log_select_own" ON activity_log;
CREATE POLICY "activity_log_select_own" ON activity_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "activity_log_insert_own" ON activity_log;
CREATE POLICY "activity_log_insert_own" ON activity_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "activity_log_delete_own" ON activity_log;
CREATE POLICY "activity_log_delete_own" ON activity_log FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS activity_log_user_idx ON activity_log(user_id, created_at);

-- ---------- settings ----------
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'light',
  notifications_enabled boolean NOT NULL DEFAULT true,
  email_digest boolean NOT NULL DEFAULT false,
  pomodoro_focus int NOT NULL DEFAULT 25,
  pomodoro_break int NOT NULL DEFAULT 5,
  week_starts_monday boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_select_own" ON settings;
CREATE POLICY "settings_select_own" ON settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "settings_insert_own" ON settings;
CREATE POLICY "settings_insert_own" ON settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "settings_update_own" ON settings;
CREATE POLICY "settings_update_own" ON settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "settings_delete_own" ON settings;
CREATE POLICY "settings_delete_own" ON settings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---------- child-table ownership policies (tasks, milestones, quiz_questions) ----------
-- tasks: scoped through parent project ownership
DROP POLICY IF EXISTS "tasks_select_own" ON tasks;
CREATE POLICY "tasks_select_own" ON tasks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid()));
DROP POLICY IF EXISTS "tasks_insert_own" ON tasks;
CREATE POLICY "tasks_insert_own" ON tasks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid()));
DROP POLICY IF EXISTS "tasks_update_own" ON tasks;
CREATE POLICY "tasks_update_own" ON tasks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid()));
DROP POLICY IF EXISTS "tasks_delete_own" ON tasks;
CREATE POLICY "tasks_delete_own" ON tasks FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid()));

-- milestones
DROP POLICY IF EXISTS "milestones_select_own" ON milestones;
CREATE POLICY "milestones_select_own" ON milestones FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = milestones.project_id AND projects.user_id = auth.uid()));
DROP POLICY IF EXISTS "milestones_insert_own" ON milestones;
CREATE POLICY "milestones_insert_own" ON milestones FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = milestones.project_id AND projects.user_id = auth.uid()));
DROP POLICY IF EXISTS "milestones_update_own" ON milestones;
CREATE POLICY "milestones_update_own" ON milestones FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = milestones.project_id AND projects.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = milestones.project_id AND projects.user_id = auth.uid()));
DROP POLICY IF EXISTS "milestones_delete_own" ON milestones;
CREATE POLICY "milestones_delete_own" ON milestones FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = milestones.project_id AND projects.user_id = auth.uid()));

-- quiz_questions: scoped through parent quiz ownership
DROP POLICY IF EXISTS "quiz_questions_select_own" ON quiz_questions;
CREATE POLICY "quiz_questions_select_own" ON quiz_questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.user_id = auth.uid()));
DROP POLICY IF EXISTS "quiz_questions_insert_own" ON quiz_questions;
CREATE POLICY "quiz_questions_insert_own" ON quiz_questions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.user_id = auth.uid()));
DROP POLICY IF EXISTS "quiz_questions_update_own" ON quiz_questions;
CREATE POLICY "quiz_questions_update_own" ON quiz_questions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.user_id = auth.uid()));
DROP POLICY IF EXISTS "quiz_questions_delete_own" ON quiz_questions;
CREATE POLICY "quiz_questions_delete_own" ON quiz_questions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.user_id = auth.uid()));

-- ---------- seed achievements catalog ----------
INSERT INTO achievements (code, title, description, icon, color, xp_reward, metric, threshold)
VALUES
  ('first_session',  'First Focus',      'Complete your first study session',        'Flame',       '#FF7F50', 50,  'sessions',    1),
  ('streak_3',       'On a Roll',        'Maintain a 3-day study streak',            'Flame',       '#FFB703', 75,  'streak',      3),
  ('streak_7',       'Week Warrior',     'Maintain a 7-day study streak',            'Flame',       '#FF7F50', 150, 'streak',      7),
  ('quiz_master',    'Quiz Master',      'Complete 5 quizzes',                       'Brain',       '#6C63FF', 100, 'quizzes',     5),
  ('flashcard_50',   'Memory Maker',     'Review 50 flashcards',                     'Layers',      '#06D6A0', 100, 'flashcards',  50),
  ('project_done',   'Project Complete', 'Finish your first project',                'Trophy',      '#4F7DF3', 120, 'projects',    1),
  ('night_owl',      'Night Owl',        'Study after 9pm 5 times',                  'Moon',        '#8BD3DD', 80,  'night',       5),
  ('xp_500',         'Rising Star',      'Earn 500 total XP',                        'Sparkles',    '#F78FB3', 200, 'xp_total',    500),
  ('xp_2000',        'Scholar',          'Earn 2000 total XP',                       'GraduationCap','#6C63FF', 400, 'xp_total',    2000),
  ('early_bird',     'Early Bird',       'Study before 8am 5 times',                 'Sun',         '#FFD166', 80,  'morning',     5)
ON CONFLICT (code) DO NOTHING;
