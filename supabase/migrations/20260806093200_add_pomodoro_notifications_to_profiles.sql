ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pomodoro_focus int NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS pomodoro_break int NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT true;