'use client';

import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, User, Palette, Target, Save, Loader2, Bell } from 'lucide-react';
import { PaperCard, Mascot } from '@/components/paper';
import { BackButton } from '@/components/app/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/lib/user-context';
import { useTheme } from '@/lib/theme-context';
import { store } from '@/lib/store';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { userId, profile, refreshProfile } = useUser();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [dailyGoal, setDailyGoal] = useState(profile?.daily_goal_minutes ?? 120);
  const [notif, setNotif] = useState(true);
  const [pomodoroFocus, setPomodoroFocus] = useState(25);
  const [pomodoroBreak, setPomodoroBreak] = useState(5);

  useEffect(() => {
    if (profile) {
      setName(profile.display_name);
      setBio(profile.bio ?? '');
      setDailyGoal(profile.daily_goal_minutes);
      setNotif(profile.notifications_enabled ?? true);
      setPomodoroFocus(profile.pomodoro_focus ?? 25);
      setPomodoroBreak(profile.pomodoro_break ?? 5);
    }
  }, [profile]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.display_name);
      setBio(profile.bio ?? '');
      setDailyGoal(profile.daily_goal_minutes);
    }
  }, [profile]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await store.from('profiles').update({
      display_name: name,
      bio,
      daily_goal_minutes: dailyGoal,
      theme,
      pomodoro_focus: pomodoroFocus,
      pomodoro_break: pomodoroBreak,
      notifications_enabled: notif,
    }).eq('id', userId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    toast.success('Settings saved!');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackButton href="/app" />
      <div>
        <h1 className="font-display text-2xl font-extrabold">Settings</h1>
        <p className="text-sm text-muted-foreground">Personalise your StudyFlow experience.</p>
      </div>

      {/* Profile */}
      <PaperCard className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold">Profile</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-violet font-display text-2xl font-bold text-white shadow-paper">
            {(name || 'S')[0]?.toUpperCase()}
          </span>
          <div>
            <p className="font-semibold">{name || 'Student'}</p>
            <p className="text-sm text-muted-foreground">Local browser account</p>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Display name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-1.5">
            <Label>Bio</Label>
            <Input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short bio" />
          </div>
        </div>
      </PaperCard>

      {/* Appearance */}
      <PaperCard className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5 text-pink" />
          <h2 className="font-display text-lg font-bold">Appearance</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`rounded-xl border-2 p-4 text-left transition-all ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/30'}`}
          >
            <div className="mb-2 h-12 rounded-lg bg-paper shadow-paper-sm" />
            <p className="text-sm font-semibold">Light</p>
            <p className="text-xs text-muted-foreground">Cream paper</p>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`rounded-xl border-2 p-4 text-left transition-all ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/30'}`}
          >
            <div className="mb-2 h-12 rounded-lg bg-card shadow-paper-sm" />
            <p className="text-sm font-semibold">Dark</p>
            <p className="text-xs text-muted-foreground">Night notebook</p>
          </button>
        </div>
      </PaperCard>

      {/* Study goals */}
      <PaperCard className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-accent" />
          <h2 className="font-display text-lg font-bold">Study goals</h2>
        </div>
        <div className="space-y-1.5">
          <Label>Daily study goal (minutes)</Label>
          <div className="flex items-center gap-3">
            <input type="range" min={30} max={480} step={30} value={dailyGoal} onChange={(e) => setDailyGoal(parseInt(e.target.value, 10))} className="flex-1 accent-primary" />
            <span className="w-20 rounded-lg bg-muted px-3 py-1.5 text-center text-sm font-bold">{dailyGoal}m</span>
          </div>
        </div>
      </PaperCard>

      {/* Pomodoro */}
      <PaperCard className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-coral" />
          <h2 className="font-display text-lg font-bold">Pomodoro & notifications</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Focus (min)</Label>
            <Select value={String(pomodoroFocus)} onValueChange={(v) => setPomodoroFocus(parseInt(v, 10))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[15, 25, 30, 45, 50].map((m) => <SelectItem key={m} value={String(m)}>{m} min</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Break (min)</Label>
            <Select value={String(pomodoroBreak)} onValueChange={(v) => setPomodoroBreak(parseInt(v, 10))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[5, 10, 15, 20].map((m) => <SelectItem key={m} value={String(m)}>{m} min</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/40 p-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">Deadline, quiz & achievement alerts</p>
          </div>
          <Switch checked={notif} onCheckedChange={setNotif} />
        </div>
      </PaperCard>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="lg">
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          Save changes
        </Button>
      </div>

      <div className="flex justify-center pt-4">
        <Mascot mood="happy" size={80} />
      </div>
    </div>
  );
}
